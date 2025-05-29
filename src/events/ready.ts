import { Events } from "discord.js"
import type { ExtendedClient } from "../structures/ExtendedClient"

export default {
  name: Events.ClientReady,
  once: true,
  execute(client: ExtendedClient) {
    if (!client.user) return

    client.logger.success(`Logged in as ${client.user.tag}`)
    client.logger.info(`Serving ${client.guilds.cache.size} guilds with ${client.users.cache.size} users`)
  },
}
