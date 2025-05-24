import { SlashCommandBuilder, type ChatInputCommandInteraction, EmbedBuilder } from "discord.js"
import { botInfo } from "../../utils/bot-info"

// Slash command definition
export const data = new SlashCommandBuilder().setName("ping").setDescription("Replies with bot latency")

// Slash command execution
export async function execute(interaction: ChatInputCommandInteraction) {
  const sent = await interaction.reply({ content: "Pinging...", fetchReply: true })
  const latency = sent.createdTimestamp - interaction.createdTimestamp
  const apiLatency = Math.round(interaction.client.ws.ping)

  const embed = new EmbedBuilder()
    .setTitle("🏓 Pong!")
    .setColor(botInfo.colors.primary)
    .addFields(
      { name: "Bot Latency", value: `${latency}ms`, inline: true },
      { name: "API Latency", value: `${apiLatency}ms`, inline: true },
    )
    .setFooter({ text: botInfo.name })
    .setTimestamp()

  await interaction.editReply({ content: null, embeds: [embed] })
}
