import { type Client, Events } from "discord.js"
import { logger } from "../utils/logger"
import { config } from "../utils/config"

export const name = Events.ClientReady
export const once = true

export function execute(client: Client) {
  logger.info(`Ready! Logged in as ${client.user?.tag}`)

  // Set bot status and activity
  client.user?.setPresence({
    status: config.presence.status,
    activities: [
      {
        name: config.presence.activity.name,
        type: config.presence.activity.type,
        url: config.presence.activity.url,
      },
    ],
  })

  logger.info(
    `Status set to: ${config.presence.status} | Activity: ${getActivityTypeName(
      config.presence.activity.type,
    )} ${config.presence.activity.name}`,
  )
}

// Helper function to get activity type name
function getActivityTypeName(type: number): string {
  switch (type) {
    case 0:
      return "Playing"
    case 1:
      return "Streaming"
    case 2:
      return "Listening to"
    case 3:
      return "Watching"
    case 4:
      return "Custom"
    case 5:
      return "Competing in"
    default:
      return "Playing"
  }
}