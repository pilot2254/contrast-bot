import { Client, Collection, GatewayIntentBits, Partials } from "discord.js"
import { config } from "./utils/config"
import { logger } from "./utils/logger"
import path from "path"
import type { Command } from "./utils/types"
import { loadCommands } from "./utils/command-loader"
import fs from "fs"
import { updateGuildCount } from "./utils/stats-manager"
import { initSafeManager } from "./utils/safe-manager"
import { initShopManager } from "./utils/shop-manager"
import { initEconomyManager } from "./utils/economy-manager"
import { initGamblingManager } from "./utils/gambling-manager"
import { performSystemCheck } from "./utils/system-check"

// Create a new client instance with ALL required intents
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences,
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
    logger.info("🚀 Starting Contrast Bot...")

    // Perform comprehensive system check
    const systemHealthy = await performSystemCheck()
    if (!systemHealthy) {
      logger.error("❌ System check failed. Bot cannot start safely.")
      process.exit(1)
    }

    // Initialize all managers
    await initEconomyManager()
    await initGamblingManager()
    await initSafeManager()
    await initShopManager()
    logger.info("✅ All systems initialized successfully")

    // Load commands
    const commandsPath = path.join(__dirname, "commands")
    const { commands, prefixCommands } = await loadCommands(commandsPath)

    if (commands.size === 0) {
      logger.error("❌ No slash commands loaded! Check command files.")
      process.exit(1)
    }

    client.commands = commands
    client.prefixCommands = prefixCommands
    logger.info(`✅ Loaded ${commands.size} slash commands and ${prefixCommands.size} prefix commands`)

    // Load events
    const eventsPath = path.join(__dirname, "events")
    if (!fs.existsSync(eventsPath)) {
      logger.error(`❌ Events directory not found at ${eventsPath}`)
      process.exit(1)
    }

    const eventFiles = fs.readdirSync(eventsPath).filter((file: string) => file.endsWith(".js") || file.endsWith(".ts"))

    if (eventFiles.length === 0) {
      logger.error("❌ No event files found!")
      process.exit(1)
    }

    for (const file of eventFiles) {
      const filePath = path.join(eventsPath, file)
      try {
        const event = await import(filePath)

        if (!event.name || !event.execute) {
          logger.warn(`Event file ${file} is missing required properties`)
          continue
        }

        if (event.once) {
          client.once(event.name, (...args) => event.execute(...args))
        } else {
          client.on(event.name, (...args) => event.execute(...args))
        }
        logger.info(`✅ Loaded event: ${event.name}`)
      } catch (error) {
        logger.error(`❌ Failed to load event ${file}:`, error)
      }
    }

    // Validate configuration
    if (!config.token) {
      logger.error("❌ Bot token is missing! Check your environment variables.")
      process.exit(1)
    }

    if (!config.clientId) {
      logger.error("❌ Client ID is missing! Check your environment variables.")
      process.exit(1)
    }

    // Login to Discord
    logger.info("🔗 Connecting to Discord...")
    await client.login(config.token)
    logger.info("✅ Bot is now online and ready!")

    // Update guild count
    await updateGuildCount(client.guilds.cache.size)
    logger.info(`📊 Bot is active in ${client.guilds.cache.size} guilds`)
  } catch (error) {
    logger.error("❌ Failed to start bot:", error)
    process.exit(1)
  }
}

// Start the bot
startBot()

// Handle process errors gracefully
process.on("unhandledRejection", (error) => {
  logger.error("❌ Unhandled promise rejection:", error)
})

process.on("uncaughtException", (error) => {
  logger.error("❌ Uncaught exception:", error)
  process.exit(1)
})

// Graceful shutdown
process.on("SIGINT", () => {
  logger.info("📴 Received SIGINT, shutting down gracefully...")
  client.destroy()
  process.exit(0)
})

process.on("SIGTERM", () => {
  logger.info("📴 Received SIGTERM, shutting down gracefully...")
  client.destroy()
  process.exit(0)
})
