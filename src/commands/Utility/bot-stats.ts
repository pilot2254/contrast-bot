import { SlashCommandBuilder, type ChatInputCommandInteraction, EmbedBuilder } from "discord.js"
import { getStats } from "../../utils/stats-manager"
import { botInfo } from "../../utils/bot-info"
import { config } from "../../utils/config"

// Slash command definition
export const data = new SlashCommandBuilder().setName("bot-stats").setDescription("Shows bot usage statistics")

// Slash command execution
export async function execute(interaction: ChatInputCommandInteraction) {
  try {
    const stats = await getStats()

    // Get most used command
    const commandEntries = Object.entries(stats.commandsUsed)
    const mostUsedCommand =
      commandEntries.length > 0 ? commandEntries.reduce((a, b) => (a[1] > b[1] ? a : b))[0] : "None"

    const embed = new EmbedBuilder()
      .setTitle(`${config.botName} Statistics`)
      .setColor(botInfo.colors.primary)
      .addFields(
        { name: "Total Commands Used", value: stats.totalCommands.toString(), inline: true },
        { name: "Most Used Command", value: mostUsedCommand, inline: true },
        { name: "Servers", value: interaction.client.guilds.cache.size.toString(), inline: true },
        { name: "Users", value: interaction.client.users.cache.size.toString(), inline: true },
        { name: "Channels", value: interaction.client.channels.cache.size.toString(), inline: true },
        { name: "Uptime", value: formatUptime(process.uptime()), inline: true },
      )
      .setFooter({ text: config.botName })
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
