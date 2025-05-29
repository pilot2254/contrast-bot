import {
  Client,
  Collection,
  GatewayIntentBits,
  type ClientOptions,
  type PresenceStatusData,
  ActivityType,
} from "discord.js"
import { Database } from "../database/Database"
import { Logger } from "../utils/Logger"
import { ErrorHandler } from "../utils/ErrorHandler"
import { config } from "../config/bot.config"
import { CommandHandler } from "../handlers/CommandHandler"
import { EventHandler } from "../handlers/EventHandler"
import path from "path"
import fs from "fs/promises"

export class ExtendedClient extends Client {
  public commands: Collection<string, any>
  public cooldowns: Collection<string, Collection<string, number>>
  public database: Database
  public logger: Logger
  public errorHandler: ErrorHandler
  private commandHandler: CommandHandler
  private eventHandler: EventHandler
  private currentActivityIndex = 0

  constructor(options: ClientOptions) {
    super(options)

    // Initialize collections and utilities
    this.commands = new Collection()
    this.cooldowns = new Collection()
    this.logger = new Logger()
    this.database = new Database(config.database.path)
    this.errorHandler = new ErrorHandler(this)
    this.commandHandler = new CommandHandler(this)
    this.eventHandler = new EventHandler(this)

    // Set up process event handlers
    this.setupProcessHandlers()
  }

  /**
   * Initialize the bot
   */
  public async start(token: string): Promise<void> {
    try {
      // Ensure data directory exists
      const dataDir = path.dirname(config.database.path)
      await fs.mkdir(dataDir, { recursive: true })

      // Initialize database
      this.logger.info("Initializing database connection...")
      await this.database.initialize()
      this.logger.success("Database initialized successfully")

      // Load commands
      this.logger.info("Loading commands...")
      await this.commandHandler.loadCommands()
      this.logger.success(`Loaded ${this.commands.size} commands`)

      // Load events
      this.logger.info("Loading events...")
      await this.eventHandler.loadEvents()
      this.logger.success("Events loaded successfully")

      // Login to Discord
      this.logger.info("Logging in to Discord...")
      await this.login(token)

      // Start presence rotation if enabled
      if (config.presence.enabled && config.presence.activities.length > 0) {
        this.startPresenceRotation()
      }
    } catch (error) {
      this.logger.error("Failed to initialize bot:", error)
      process.exit(1)
    }
  }

  /**
   * Set up process event handlers for graceful shutdown and error handling
   */
  private setupProcessHandlers(): void {
    process.on("unhandledRejection", (error: Error) => {
      this.logger.error("Unhandled promise rejection:", error)
      this.errorHandler.handle(error, { context: "Unhandled Promise Rejection" })
    })

    process.on("uncaughtException", (error: Error) => {
      this.logger.error("Uncaught exception:", error)
      this.errorHandler.handle(error, { context: "Uncaught Exception" })
      // Don't exit immediately to allow error reporting
      setTimeout(() => process.exit(1), 1000)
    })

    process.on("SIGINT", async () => {
      this.logger.info("Received SIGINT, shutting down gracefully...")
      await this.shutdown()
      process.exit(0)
    })

    process.on("SIGTERM", async () => {
      this.logger.info("Received SIGTERM, shutting down gracefully...")
      await this.shutdown()
      process.exit(0)
    })
  }

  /**
   * Gracefully shut down the bot
   */
  private async shutdown(): Promise<void> {
    try {
      // Close database connection
      await this.database.close()

      // Destroy client connection
      this.destroy()

      this.logger.success("Bot has been gracefully shut down")
    } catch (error) {
      this.logger.error("Error during shutdown:", error)
    }
  }

  private startPresenceRotation(): void {
    if (!config.presence.enabled || config.presence.activities.length === 0) {
      return
    }

    setInterval(() => {
      const activityConfig = config.presence.activities[this.currentActivityIndex]
      this.user?.setPresence({
        activities: [
          {
            name: activityConfig.name,
            type: ActivityType[activityConfig.type as keyof typeof ActivityType],
            url: activityConfig.url || undefined,
          },
        ],
        status: config.presence.status as PresenceStatusData,
      })

      this.currentActivityIndex = (this.currentActivityIndex + 1) % config.presence.activities.length
      this.logger.debug(`Presence updated to: ${activityConfig.name} (${activityConfig.type})`)
    }, config.presence.rotationInterval)
  }

  /**
   * Create a new client instance with default configuration
   */
  public static createClient(): ExtendedClient {
    return new ExtendedClient({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
      ],
      presence: {
        activities:
          config.presence.enabled && config.presence.activities.length > 0
            ? [
                {
                  name: config.presence.activities[0].name,
                  type: ActivityType[config.presence.activities[0].type as keyof typeof ActivityType],
                  url: config.presence.activities[0].url || undefined,
                },
              ]
            : [],
        status: config.presence.status as PresenceStatusData,
      },
      // Add more reliability options
      failIfNotExists: false,
      rest: {
        retries: 3,
        timeout: 15000,
      },
    })
  }
}
