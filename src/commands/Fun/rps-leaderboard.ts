import { SlashCommandBuilder, type ChatInputCommandInteraction, EmbedBuilder } from "discord.js"
import { getTopPlayers } from "../../utils/rps-manager"
import { botInfo } from "../../utils/bot-info"

// Slash command definition
export const data = new SlashCommandBuilder()
  .setName("rps-leaderboard")
  .setDescription("Shows the Rock Paper Scissors leaderboard")
  .addStringOption((option) =>
    option
      .setName("sort")
      .setDescription("How to sort the leaderboard")
      .setRequired(false)
      .addChoices(
        { name: "Wins", value: "wins" },
        { name: "Win Rate", value: "winrate" },
        { name: "Total Games", value: "total" },
      ),
  )
  .addIntegerOption((option) =>
    option
      .setName("limit")
      .setDescription("Number of users to show (1-20)")
      .setRequired(false)
      .setMinValue(1)
      .setMaxValue(20),
  )

// Slash command execution
export async function execute(interaction: ChatInputCommandInteraction) {
  const sortBy = interaction.options.getString("sort") || "wins"
  const limit = interaction.options.getInteger("limit") || 10

  try {
    const leaderboard = await getTopPlayers(limit)

    if (leaderboard.length === 0) {
      return interaction.reply({ content: "No RPS data found!", ephemeral: true })
    }

    const embed = new EmbedBuilder()
      .setTitle("🏆 Rock Paper Scissors Leaderboard")
      .setColor(botInfo.colors.primary)
      .setTimestamp()

    const description = leaderboard
      .map((user: any, index: number) => {
        const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `${index + 1}.`
        const winRate = user.totalGames > 0 ? ((user.wins / user.totalGames) * 100).toFixed(1) : "0.0"

        if (sortBy === "winrate") {
          return `${medal} **${user.username}** - ${winRate}% (${user.wins}W/${user.losses}L/${user.ties}T)`
        } else if (sortBy === "total") {
          return `${medal} **${user.username}** - ${user.totalGames} games (${user.wins}W/${user.losses}L/${user.ties}T)`
        } else {
          return `${medal} **${user.username}** - ${user.wins} wins (${winRate}% WR)`
        }
      })
      .join("\n")

    embed.setDescription(description)

    const sortLabels = {
      wins: "Most Wins",
      winrate: "Highest Win Rate",
      total: "Most Games Played",
    }

    embed.setFooter({ text: `Sorted by: ${sortLabels[sortBy as keyof typeof sortLabels]}` })

    await interaction.reply({ embeds: [embed] })
  } catch (error) {
    await interaction.reply({ content: "An error occurred while fetching the leaderboard.", ephemeral: true })
  }
}
