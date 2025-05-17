import { type Client, Events, ActivityType } from "discord.js"
import { logger } from "../utils/logger"
import { config } from "../utils/config"

export const name = Events.ClientReady
export const once = true

export function execute(client: Client) {
  logger.info(`Ready! Logged in as ${client.user?.tag}`)

  // Set bot status
  client.user?.setPresence({
    activities: [{ name: `as ${config.botName}`, type: ActivityType.Playing }],
    status: "online",
  })
}