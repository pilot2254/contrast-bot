import dotenv from "dotenv"
import { ActivityType, GatewayIntentBits, Partials, type PresenceStatusData } from "discord.js"
import { logger } from "./logger"

// Load environment variables first
dotenv.config()

interface Config {
  token: string
  clientId: string
  guildId?: string
  prefix: string
  botName: string
  status: string
  activityType: ActivityType
  activityName: string
  activityUrl?: string
  deployGuildCommands: boolean
  donateUrl?: string
  developerWebhookUrl?: string
  developerIds: string[]
  presence: {
    status: PresenceStatusData
    activity: {
      type: ActivityType
      name: string
      url?: string
    }
  }
  intents: GatewayIntentBits[]
  partials: Partials[]
}

// Helper function to convert string to ActivityType
function getActivityType(type: string | undefined): ActivityType {
  switch (type?.toLowerCase()) {
    case "playing":
      return ActivityType.Playing
    case "streaming":
      return ActivityType.Streaming
    case "listening":
      return ActivityType.Listening
    case "watching":
      return ActivityType.Watching
    case "competing":
      return ActivityType.Competing
    default:
      return ActivityType.Playing
  }
}

// Validate required environment variables
function validateEnv(): void {
  const required = ["TOKEN", "CLIENT_ID", "BOT_NAME"]
  const missing = required.filter((key) => !process.env[key])

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`)
  }
}

// Validate environment on import
validateEnv()

// Create the config object
export const config: Config = {
  token: process.env.TOKEN!,
  clientId: process.env.CLIENT_ID!,
  guildId: process.env.GUILD_ID,
  prefix: process.env.PREFIX || "?",
  botName: process.env.BOT_NAME!,
  status: process.env.STATUS || "online",
  activityType: (process.env.ACTIVITY_TYPE as keyof typeof ActivityType)
    ? ActivityType[process.env.ACTIVITY_TYPE as keyof typeof ActivityType]
    : ActivityType.Playing,
  activityName: process.env.ACTIVITY_NAME || "with commands",
  activityUrl: process.env.ACTIVITY_URL,
  deployGuildCommands: process.env.DEPLOY_GUILD_COMMANDS === "true",
  developerIds: ["171395713064894465"], // Add your developer IDs here
  presence: {
    status: (process.env.STATUS as PresenceStatusData) || "online",
    activity: {
      type: getActivityType(process.env.ACTIVITY_TYPE),
      name: process.env.ACTIVITY_NAME || "Discord",
      url: process.env.ACTIVITY_URL,
    },
  },
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel, Partials.Message, Partials.User, Partials.GuildMember],
}

// Validate required config values
if (!config.token) {
  logger.error("No token provided in environment variables")
  process.exit(1)
}

if (!config.clientId) {
  logger.error("No client ID provided in environment variables")
  process.exit(1)
}

// Log configuration (without sensitive data)
console.log("📋 Bot Configuration:")
console.log(`  Bot Name: ${config.botName}`)
console.log(`  Prefix: ${config.prefix}`)
console.log(`  Status: ${config.presence.status}`)
console.log(`  Activity: ${ActivityType[config.presence.activity.type]} ${config.presence.activity.name}`)
console.log(`  Guild Commands: ${config.deployGuildCommands}`)
console.log(`  Guild ID: ${config.guildId || "Not set (global deployment)"}`)

export default config
