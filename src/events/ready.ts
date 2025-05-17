import { type Client, Events, ActivityType } from "discord.js"
import { logger } from "../utils/logger"
import { config } from "../utils/config"
import { updateGuildCount } from "../utils/stats-manager"

export const name = Events.ClientReady
export const once = true

export async function execute(client: Client) {
  logger.info(`Ready! Logged in as ${client.user?.tag}`)

  // Update guild count
  updateGuildCount(client.guilds.cache.size)

  try {
    // First, set the status
    await client.user?.setStatus(config.presence.status)
    logger.info(`Status set to: ${config.presence.status}`)

    // Wait a moment before setting activity (helps with Discord API)
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // Get activity details
    const activityType = parseActivityType(config.presence.activity.type)
    const activityName = config.presence.activity.name || `with Discord.js`

    // Set activity using the direct method that works in activity-test
    await client.user?.setActivity(activityName, { type: activityType })

    logger.info(`Activity set to: ${getActivityTypeName(activityType)} ${activityName}`)
    logger.info(`Using direct setActivity() method that works in activity-test`)

    // Note about invisible status
    if (config.presence.status === "invisible") {
      logger.info(
        "Note: Discord may show the bot as DND briefly before changing to invisible. This is normal behavior.",
      )
    }
  } catch (error) {
    logger.error("Failed to set presence:", error)
  }
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
