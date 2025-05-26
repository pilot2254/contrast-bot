import { SlashCommandBuilder, type ChatInputCommandInteraction, EmbedBuilder } from "discord.js"
import { getLevelLeaderboard } from "../../utils/level-manager"
import { botInfo } from "../../utils/bot-info"
import { config } from "../../utils/config"

export const data = new SlashCommandBuilder()
  .setName("levels")
  .setDescription("View the global level leaderboard")
  .addIntegerOption((option) =>
    option
      .setName("limit")
      .setDescription("Number of users to show (1-20)")
      .setRequired(false)
      .setMinValue(1)
      .setMaxValue(20),
  )

export async function execute(interaction: ChatInputCommandInteraction) {
  const limit = interaction.options.getInteger("limit") || 10

  try {
    const leaderboard = await getLevelLeaderboard(limit)

    if (leaderboard.length === 0) {
      return interaction.reply({ content: "📊 No level data available yet!", ephemeral: true })
    }

    const embed = new EmbedBuilder()
      .setTitle("🏆 Global Level Leaderboard")
      .setColor(botInfo.colors.primary)
      .setFooter({ text: `${config.botName} • Showing top ${leaderboard.length} users` })
      .setTimestamp()

    const description = leaderboard
      .map((entry, index) => {
        const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `${index + 1}.`
        const levelEmoji = entry.level >= 50 ? "🌟" : entry.level >= 25 ? "⭐" : entry.level >= 10 ? "🔥" : "📊"
        return `${medal} **${entry.username}** ${levelEmoji} Level ${entry.level} (${entry.xp.toLocaleString()} XP)`
      })
      .join("\n")

    embed.setDescription(description)

    await interaction.reply({ embeds: [embed] })
  } catch (error) {
    await interaction.reply({ content: "❌ An error occurred while fetching the leaderboard.", ephemeral: true })
  }
}
