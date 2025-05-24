import { SlashCommandBuilder, type ChatInputCommandInteraction, EmbedBuilder } from "discord.js"
import { getRPSStats } from "../../utils/rps-manager"
import { botInfo } from "../../utils/bot-info"

// Slash command definition
export const data = new SlashCommandBuilder()
  .setName("rps-stats")
  .setDescription("Check Rock Paper Scissors statistics")
  .addUserOption((option) => option.setName("user").setDescription("User to check stats for").setRequired(false))

// Slash command execution
export async function execute(interaction: ChatInputCommandInteraction) {
  const targetUser = interaction.options.getUser("user") || interaction.user

  try {
    const stats = await getRPSStats(targetUser.id)

    const winRate = stats.total > 0 ? ((stats.wins / stats.total) * 100).toFixed(1) : "0.0"

    const embed = new EmbedBuilder()
      .setTitle(`🎮 ${targetUser.tag}'s RPS Statistics`)
      .setColor(botInfo.colors.primary)
      .setThumbnail(targetUser.displayAvatarURL())
      .addFields(
        { name: "🏆 Wins", value: stats.wins.toString(), inline: true },
        { name: "💀 Losses", value: stats.losses.toString(), inline: true },
        { name: "🤝 Ties", value: stats.ties.toString(), inline: true },
        { name: "📊 Total Games", value: stats.total.toString(), inline: true },
        { name: "📈 Win Rate", value: `${winRate}%`, inline: true },
        { name: "🎯 Score", value: `${stats.wins - stats.losses}`, inline: true },
      )
      .setTimestamp()

    if (stats.total === 0) {
      embed.setDescription("No games played yet! Use `/rps` to start playing.")
    }

    await interaction.reply({ embeds: [embed] })
  } catch (error) {
    await interaction.reply({ content: "An error occurred while fetching RPS statistics.", ephemeral: true })
  }
}
