import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js"
import { CustomEmbedBuilder } from "../../utils/EmbedBuilder"
import { config } from "../../config/bot.config"
import type { ExtendedClient } from "../../structures/ExtendedClient"
import type { Command } from "../../types/Command"

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Check the bot's latency"),
  category: "misc",
  cooldown: 3,
  async execute(
    interaction: ChatInputCommandInteraction,
    client: ExtendedClient
  ) {
    const sent = await interaction.reply({
      content: "Pinging...",
      fetchReply: true,
    })

    const roundtripLatency =
      sent.createdTimestamp - interaction.createdTimestamp
    const websocketLatency = Math.round(client.ws.ping)

    const embed = CustomEmbedBuilder.info()
      .setTitle("🏓 Pong!")
      .addFields(
        {
          name: "⏱️ Roundtrip Latency",
          value: `${roundtripLatency}ms`,
          inline: true,
        },
        {
          name: "💓 Websocket Heartbeat",
          value: `${websocketLatency}ms`,
          inline: true,
        }
      )

    // Add color based on latency
    if (websocketLatency < 100) {
      embed.setColor(config.embeds.colors.success)
    } else if (websocketLatency < 200) {
      embed.setColor(config.embeds.colors.warning)
    } else {
      embed.setColor(config.embeds.colors.error)
    }

    await interaction.editReply({ content: null, embeds: [embed] })
  },
}

export default command
