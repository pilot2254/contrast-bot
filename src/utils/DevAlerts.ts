import type { TextChannel } from "discord.js"
import type { ExtendedClient } from "../structures/ExtendedClient"

export class DevAlerts {
  constructor(private client: ExtendedClient) {}

  async sendDevCommandAlert(
    userId: string,
    command: string,
    guildId?: string
  ): Promise<void> {
    try {
      if (!process.env.DEV_ALERTS_CHANNEL) return

      const channel = await this.client.channels.fetch(
        process.env.DEV_ALERTS_CHANNEL
      )
      if (!channel || !channel.isTextBased()) return

      const user = await this.client.users.fetch(userId).catch(() => null)
      const guild = guildId
        ? await this.client.guilds.fetch(guildId).catch(() => null)
        : null

      const embed = {
        color: 0xff9900,
        title: "🔧 Developer Command Used",
        fields: [
          {
            name: "User",
            value: user
              ? `${user.tag} (${user.id})`
              : `Unknown User (${userId})`,
            inline: true,
          },
          {
            name: "Command",
            value: `\`${command}\``,
            inline: true,
          },
          {
            name: "Server",
            value: guild
              ? `${guild.name} (${guild.id})`
              : guildId
                ? `Unknown Server (${guildId})`
                : "DM",
            inline: true,
          },
        ],
        timestamp: new Date().toISOString(),
      }

      await (channel as TextChannel).send({ embeds: [embed] })
    } catch (error) {
      this.client.logger.error("Failed to send dev command alert:", error)
    }
  }
}
