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
import type { Command } from "../types/Command" // Import the Command type

export class ExtendedClient extends Client {
  public commands: Collection<string, Command> // Use the specific Command type
  public cooldowns: Collection<string, Collection<string, number>>
  public database: Database
  public logger: Logger
  public errorHandler: ErrorHandler
  private commandHandler: CommandHandler
  private eventHandler: EventHandler
  private currentActivityIndex = 0

  constructor(options: ClientOptions) {
    super(options)

    this.commands = new Collection()
    this.cooldowns = new Collection()
    this.logger = new Logger()
    this.database = new Database(config.database.path)
    this.errorHandler = new ErrorHandler(this)
    this.commandHandler = new CommandHandler(this)
    this.eventHandler = new EventHandler(this)

    this.setupProcessHandlers()
  }

  public async start(token: string): Promise<void> {
    try {
      const dataDir = path.dirname(config.database.path)
      await fs.mkdir(dataDir, { recursive: true })

      this.logger.info("Initializing database connection...")
      await this.database.initialize()
      this.logger.success("Database initialized successfully")

      this.logger.info("Loading commands...")
      await this.commandHandler.loadCommands() // This now uses dynamic import
      this.logger.success(`Loaded ${this.commands.size} commands`)

      this.logger.info("Loading events...")
      await this.eventHandler.loadEvents() // This now uses dynamic import
      this.logger.success("Events loaded successfully")

      this.logger.info("Logging in to Discord...")
      await this.login(token)

      if (config.presence.enabled && config.presence.activities.length > 0) {
        this.setInitialPresence()
        this.startPresenceRotation()
      }
    } catch (error: unknown) {
      this.logger.error("Failed to initialize bot:", error)
      process.exit(1)
    }
  }

  private setupProcessHandlers(): void {
    process.on("unhandledRejection", (reason: unknown, promise: Promise<unknown>) => {
      this.logger.error("Unhandled promise rejection:", { reason, promise })
      const errorToHandle = reason instanceof Error ? reason : new Error(`Unhandled rejection: ${String(reason)}`)
      this.errorHandler.handle(errorToHandle, { context: "Unhandled Promise Rejection" })
    })

    process.on("uncaughtException", (error: Error) => {
      this.logger.error("Uncaught exception:", error)
      this.errorHandler.handle(error, { context: "Uncaught Exception" })
      setTimeout(() => process.exit(1), 1000)
    })

    const signalHandler = async (signal: string) => {
      this.logger.info(`Received ${signal}, shutting down gracefully...`)
      await this.shutdown()
      process.exit(0)
    }

    process.on("SIGINT", () => signalHandler("SIGINT"))
    process.on("SIGTERM", () => signalHandler("SIGTERM"))
  }

  private async shutdown(): Promise<void> {
    try {
      await this.database.close()
      this.destroy()
      this.logger.success("Bot has been gracefully shut down")
    } catch (error: unknown) {
      this.logger.error("Error during shutdown:", error)
    }
  }

  private setInitialPresence(): void {
    if (!this.user || !config.presence.enabled || config.presence.activities.length === 0) {
      return
    }
    const activityConfig = config.presence.activities[0]
    this.user.setPresence({
      activities: [
        {
          name: activityConfig.name,
          type: ActivityType[activityConfig.type as keyof typeof ActivityType],
          url: activityConfig.url || undefined,
        },
      ],
      status: config.presence.status as PresenceStatusData,
    })
    this.logger.debug(`Initial presence set to: ${activityConfig.name} (${activityConfig.type})`)
  }

  private startPresenceRotation(): void {
    if (!config.presence.enabled || config.presence.activities.length === 0) {
      return
    }
    // Start rotation with the second activity if more than one, or keep first if only one.
    this.currentActivityIndex = config.presence.activities.length > 1 ? 1 : 0

    setInterval(() => {
      if (!this.user) return // Guard against user not being available

      const activityConfig = config.presence.activities[this.currentActivityIndex]
      this.user.setPresence({
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

  public static createClient(): ExtendedClient {
    return new ExtendedClient({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildPresences, // Often needed for full member data or presence updates
      ],
      // Presence is set dynamically after login by startPresenceRotation
      // So, initial presence here can be minimal or omitted if handled by rotation.
      presence:
        config.presence.enabled && config.presence.activities.length > 0
          ? {
              activities: [
                {
                  name: config.presence.activities[0].name,
                  type: ActivityType[config.presence.activities[0].type as keyof typeof ActivityType],
                  url: config.presence.activities[0].url || undefined,
                },
              ],
              status: config.presence.status as PresenceStatusData,
            }
          : undefined,
      failIfNotExists: false,
      rest: {
        retries: 3,
        timeout: 15000,
      },
    })
  }
}
