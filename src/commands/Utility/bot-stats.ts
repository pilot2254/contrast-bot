import { SlashCommandBuilder, type ChatInputCommandInteraction, EmbedBuilder } from "discord.js"
import { getStats } from "../../utils/stats-manager"
import { botInfo } from "../../utils/bot-info"

// Slash command definition
export const data = new SlashCommandBuilder().setName("bot-stats").setDescription("Shows bot usage statistics")

// Slash command execution
export async function execute(interaction: ChatInputCommandInteraction) {
  try {
    const stats = await getStats()

    const embed = new EmbedBuilder()
      .setTitle("Bot Statistics")
      .setColor(botInfo.colors.primary)
      .addFields(
        { name: "Total Commands Used", value: stats.totalCommands.toString(), inline: true },
        { name: "Most Used Command", value: stats.mostUsedCommand || "None", inline: true },
        { name: "Servers", value: interaction.client.guilds.cache.size.toString(), inline: true },
        { name: "Users", value: interaction.client.users.cache.size.toString(), inline: true },
        { name: "Channels", value: interaction.client.channels.cache.size.toString(), inline: true },
        { name: "Uptime", value: formatUptime(process.uptime()), inline: true },
      )
      .setTimestamp()

    await interaction.reply({ embeds: [embed] })
  } catch (error) {
    await interaction.reply({ content: "Failed to fetch bot statistics.", ephemeral: true })
  }
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  return `${days}d ${hours}h ${minutes}m`
}
