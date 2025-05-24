import dotenv from "dotenv"
import { logger } from "./logger"
import { ActivityType, GatewayIntentBits, Partials, type PresenceStatusData } from "discord.js"

// Load environment variables
dotenv.config()

// Define the Config interface
export interface Config {
  token: string
  clientId: string
  guildId: string
  prefix: string
  botName: string
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
  deployGuildCommands: boolean
}

// Create the config object
export const config: Config = {
  token: process.env.TOKEN || "",
  clientId: process.env.CLIENT_ID || "",
  guildId: process.env.GUILD_ID || "",
  prefix: process.env.PREFIX || "?",
  botName: process.env.BOT_NAME || "Contrast",
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
  deployGuildCommands: process.env.DEPLOY_GUILD_COMMANDS === "true",
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

export default config
