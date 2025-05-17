import dotenv from "dotenv"
import { logger } from "./logger"
import { ActivityType, type PresenceStatusData } from "discord.js"

// Load environment variables
dotenv.config()

// Define configuration interface
interface Config {
  token: string
  clientId: string
  guildId: string
  prefix: string
  botName: string
  presence: {
    status: PresenceStatusData
    activity: {
      type: ActivityType
      name: string
      url?: string // For streaming status
    }
  }
}

// Validate required environment variables
const requiredEnvVars = ["TOKEN", "CLIENT_ID"]
const missingEnvVars = requiredEnvVars.filter((envVar) => !process.env[envVar])

if (missingEnvVars.length > 0) {
  logger.error(`Missing required environment variables: ${missingEnvVars.join(", ")}`)
  logger.info("Please check your .env file and ensure all required variables are set.")
  process.exit(1)
}

// Parse activity type from environment variable
const getActivityType = (): ActivityType => {
  const activityType = process.env.ACTIVITY_TYPE?.toUpperCase() || "PLAYING"

  // Map string to ActivityType enum
  switch (activityType) {
    case "PLAYING":
      return ActivityType.Playing
    case "WATCHING":
      return ActivityType.Watching
    case "LISTENING":
      return ActivityType.Listening
    case "COMPETING":
      return ActivityType.Competing
    case "STREAMING":
      return ActivityType.Streaming
    default:
      return ActivityType.Playing
  }
}

// Parse status from environment variable
const getStatus = (): PresenceStatusData => {
  const status = process.env.STATUS?.toLowerCase() || "online"

  // Validate status
  switch (status) {
    case "online":
    case "idle":
    case "dnd":
    case "invisible":
      return status as PresenceStatusData
    default:
      return "online"
  }
}

// Get activity name with fallback
const getActivityName = (): string => {
  return process.env.ACTIVITY_NAME || `as ${process.env.BOT_NAME || "Contrast"}`
}

// Export configuration
export const config: Config = {
  token: process.env.TOKEN!,
  clientId: process.env.CLIENT_ID!,
  guildId: process.env.GUILD_ID || "",
  prefix: process.env.PREFIX || "?",
  botName: process.env.BOT_NAME || "Contrast",
  presence: {
    status: getStatus(),
    activity: {
      type: getActivityType(),
      name: getActivityName(),
      url: process.env.ACTIVITY_URL, // Only used for streaming status
    },
  },
}

// Log presence configuration
logger.info(`Loaded presence config:`)
logger.info(`- Status: ${config.presence.status}`)
logger.info(
  `- Activity Type: ${config.presence.activity.type} (${ActivityType[config.presence.activity.type] || "Unknown"})`,
)
logger.info(`- Activity Name: "${config.presence.activity.name}"`)
if (config.presence.activity.url) {
  logger.info(`- Activity URL: ${config.presence.activity.url}`)
}