import { SlashCommandBuilder, type ChatInputCommandInteraction, EmbedBuilder } from "discord.js"
import { botInfo } from "../../utils/bot-info"
import { getLevelLeaderboard } from "../../utils/level-manager"

export const data = new SlashCommandBuilder()
  .setName("levels")
  .setDescription("View the global level leaderboard")
  .addIntegerOption((option) =>
    option
      .setName("limit")
      .setDescription("Number of users to show (1-25)")
      .setRequired(false)
      .setMinValue(1)
      .setMaxValue(25),
  )

export async function execute(interaction: ChatInputCommandInteraction) {
  const limit = interaction.options.getInteger("limit") || 10

  try {
    // Get leaderboard
    const leaderboard = await getLevelLeaderboard(limit)

    if (leaderboard.length === 0) {
      return interaction.reply({
        content: "No level data available yet!",
        ephemeral: true,
      })
    }

    // Create embed
    const embed = new EmbedBuilder()
      .setTitle("🏆 Global Level Leaderboard")
      .setColor(botInfo.colors.primary)
      .setDescription(
        leaderboard
          .map((user, index) => {
            const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `${index + 1}.`
            return `${medal} **${user.username}** - Level ${user.level} (${user.xp.toLocaleString()} XP)`
          })
          .join("\n"),
      )
      .setFooter({ text: `Showing top ${leaderboard.length} users by level` })
      .setTimestamp()

    await interaction.reply({ embeds: [embed] })
  } catch (error) {
    await interaction.reply({
      content: "Failed to retrieve leaderboard. Please try again later.",
      ephemeral: true,
    })
  }
}
