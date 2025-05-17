import { Client, Collection, GatewayIntentBits, Partials } from "discord.js"
import { config } from "./utils/config"
import { logger } from "./utils/logger"
import fs from "fs"
import path from "path"
import type { Command } from "./utils/types"
import { ensureDataDirectory } from "./utils/data-directory"

// Ensure data directory exists
ensureDataDirectory()

// Create a new client instance with ALL required intents
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences, // Add this for presence support
  ],
  partials: [Partials.Channel, Partials.Message, Partials.User, Partials.GuildMember],
})

// Make client globally available for reminder manager
;(global as any).client = client

// Extend the client to include commands
declare module "discord.js" {
  interface Client {
    commands: Collection<string, Command>
    prefixCommands: Collection<string, Command>
  }
}

// Initialize command collections
client.commands = new Collection()
client.prefixCommands = new Collection()

// Load commands
const commandsPath = path.join(__dirname, "commands")
const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith(".js") || file.endsWith(".ts"))

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file)
  import(filePath)
    .then((command) => {
      // Set slash command in the collection
      if (command.data) {
        client.commands.set(command.data.name, command)
        logger.info(`Loaded slash command: ${command.data.name}`)
      }

      // Set prefix command in the collection
      if (command.name) {
        client.prefixCommands.set(command.name, command)
        logger.info(`Loaded prefix command: ${command.name}`)
      }
    })
    .catch((error) => {
      logger.error(`Error loading command from ${filePath}:`, error)
    })
}

// Load events
const eventsPath = path.join(__dirname, "events")
const eventFiles = fs.readdirSync(eventsPath).filter((file) => file.endsWith(".js") || file.endsWith(".ts"))

for (const file of eventFiles) {
  const filePath = path.join(eventsPath, file)
  import(filePath)
    .then((event) => {
      if (event.once) {
        client.once(event.name, (...args) => event.execute(...args))
      } else {
        client.on(event.name, (...args) => event.execute(...args))
      }
      logger.info(`Loaded event: ${event.name}`)
    })
    .catch((error) => {
      logger.error(`Error loading event from ${filePath}:`, error)
    })
}

// Login to Discord with your client's token
client
  .login(config.token)
  .then(() => {
    logger.info("Bot is starting up...")
  })
  .catch((error) => {
    logger.error("Error during login:", error)
    process.exit(1)
  })

// Handle process errors
process.on("unhandledRejection", (error) => {
  logger.error("Unhandled promise rejection:", error)
})

process.on("uncaughtException", (error) => {
  logger.error("Uncaught exception:", error)
  process.exit(1)
})
