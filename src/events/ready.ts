import { type Client, Events, ActivityType, type PresenceStatusData } from "discord.js"
import { logger } from "../utils/logger"
import { updateGuildCount } from "../utils/stats-manager"
import { config } from "../utils/config"

export const name = Events.ClientReady
export const once = true

export async function execute(client: Client): Promise<void> {
  if (!client.user) return

  logger.info(`Ready! Logged in as ${client.user.tag}`)

  // Update guild count
  await updateGuildCount(client.guilds.cache.size)

  // Set bot status from environment variables
  try {
    // Get presence settings from environment
    const status = (process.env.STATUS?.toLowerCase() || "online") as PresenceStatusData
    const activityTypeStr = process.env.ACTIVITY_TYPE?.toUpperCase() || "PLAYING"
    const activityName = process.env.ACTIVITY_NAME || `with Discord.js`
    const activityUrl = process.env.ACTIVITY_URL

    // Parse activity type
    let activityType: ActivityType = ActivityType.Playing
    switch (activityTypeStr) {
      case "PLAYING":
        activityType = ActivityType.Playing
        break
      case "STREAMING":
        activityType = ActivityType.Streaming
        break
      case "LISTENING":
        activityType = ActivityType.Listening
        break
      case "WATCHING":
        activityType = ActivityType.Watching
        break
      case "COMPETING":
        activityType = ActivityType.Competing
        break
    }

    // Set status first
    await client.user.setStatus(status)
    logger.info(`Status set to: ${status}`)

    // Set activity with proper options
    const activityOptions: any = { type: activityType }
    if (activityType === ActivityType.Streaming && activityUrl) {
      activityOptions.url = activityUrl
    }

    await client.user.setActivity(activityName, activityOptions)
    logger.info(`Activity set to: ${getActivityTypeName(activityType)} ${activityName}`)
  } catch (error) {
    logger.error("Failed to set presence:", error)
    // Fallback to default presence
    client.user.setActivity(`${config.botName} | /help | Serving ${client.guilds.cache.size} servers`, {
      type: ActivityType.Playing,
    })
  }
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
