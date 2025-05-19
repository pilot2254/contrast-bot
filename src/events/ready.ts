import { type Client, Events, ActivityType } from "discord.js"
import { logger } from "../utils/logger"
import { updateGuildCount } from "../utils/stats-manager"

export const name = Events.ClientReady
export const once = true

export async function execute(client: Client): Promise<void> {
  if (!client.user) return

  logger.info(`Ready! Logged in as ${client.user.tag}`)

  // Update guild count
  await updateGuildCount(client.guilds.cache.size)

  // Set bot status
  client.user.setActivity(`/help | Serving ${client.guilds.cache.size} servers`)
}

// Helper function to parse activity type
function parseActivityType(type: any): ActivityType {
  // If it's already a number, validate it's in range
  if (typeof type === "number") {
    if (type >= 0 && type <= 5 && type !== 4) {
      // 4 is Custom which bots can't use
      return type as ActivityType
    }
    return ActivityType.Playing // Default fallback
  }

  // If it's a string, convert it
  if (typeof type === "string") {
    switch (type.toString().toUpperCase()) {
      case "PLAYING":
        return ActivityType.Playing
      case "STREAMING":
        return ActivityType.Streaming
      case "LISTENING":
        return ActivityType.Listening
      case "WATCHING":
        return ActivityType.Watching
      case "COMPETING":
        return ActivityType.Competing
      default:
        return ActivityType.Playing
    }
  }

  // Default fallback
  return ActivityType.Playing
}

// Helper function to get activity type name
function getActivityTypeName(type: ActivityType): string {
  switch (type) {
    case ActivityType.Playing:
      return "Playing"
    case ActivityType.Streaming:
      return "Streaming"
    case ActivityType.Listening:
      return "Listening to"
    case ActivityType.Watching:
      return "Watching"
    case ActivityType.Custom:
      return "Custom"
    case ActivityType.Competing:
      return "Competing in"
    default:
      return "Playing"
  }
}
