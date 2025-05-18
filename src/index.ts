import { Client, Collection, GatewayIntentBits, Partials } from "discord.js"
import { config } from "./utils/config"
import { logger } from "./utils/logger"
import path from "path"
import type { Command } from "./utils/types"
import { ensureDataDirectory } from "./utils/data-directory"
import { loadCommands } from "./utils/command-loader"

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
loadCommands(commandsPath).then(({ commands, prefixCommands }) => {
  client.commands = commands
  client.prefixCommands = prefixCommands
  logger.info(`Loaded ${commands.size} slash commands and ${prefixCommands.size} prefix commands`)
})

// Load events
const eventsPath = path.join(__dirname, "events")
import fs from "fs"
const eventFiles = fs.readdirSync(eventsPath).filter((file: string) => file.endsWith(".js") || file.endsWith(".ts"))

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
