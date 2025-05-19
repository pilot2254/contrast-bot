import { Client, Collection, GatewayIntentBits, Partials } from "discord.js"
import { config } from "./utils/config"
import { logger } from "./utils/logger"
import path from "path"
import type { Command } from "./utils/types"
import { initDatabase } from "./utils/database"
import { loadCommands } from "./utils/command-loader"
import fs from "fs" // Moved import statement to the top level

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

// Initialize database and start the bot
async function startBot() {
  try {
    // Initialize database
    await initDatabase()
    logger.info("Database initialized")

    // Load commands
    const commandsPath = path.join(__dirname, "commands")
    const { commands, prefixCommands } = await loadCommands(commandsPath)
    client.commands = commands
    client.prefixCommands = prefixCommands
    logger.info(`Loaded ${commands.size} slash commands and ${prefixCommands.size} prefix commands`)

    // Load events
    const eventsPath = path.join(__dirname, "events")
    const eventFiles = fs.readdirSync(eventsPath).filter((file: string) => file.endsWith(".js") || file.endsWith(".ts"))

    for (const file of eventFiles) {
      const filePath = path.join(eventsPath, file)
      const event = await import(filePath)

      if (event.once) {
        client.once(event.name, (...args) => event.execute(...args))
      } else {
        client.on(event.name, (...args) => event.execute(...args))
      }
      logger.info(`Loaded event: ${event.name}`)
    }

    // Login to Discord with your client's token
    await client.login(config.token)
    logger.info("Bot is now online!")
  } catch (error) {
    logger.error("Failed to start bot:", error)
    process.exit(1)
  }
}

// Start the bot
startBot()

// Handle process errors
process.on("unhandledRejection", (error) => {
  logger.error("Unhandled promise rejection:", error)
})

process.on("uncaughtException", (error) => {
  logger.error("Uncaught exception:", error)
  process.exit(1)
})
