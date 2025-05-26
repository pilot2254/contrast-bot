import { SlashCommandBuilder, type ChatInputCommandInteraction, EmbedBuilder } from "discord.js"
import { getGamblingStats, getGamblingLeaderboard } from "../../utils/gambling-manager"
import { botInfo } from "../../utils/bot-info"
import { config } from "../../utils/config"

// Slash command definition
export const data = new SlashCommandBuilder()
  .setName("gambling-stats")
  .setDescription("View gambling statistics and leaderboards")
  .addSubcommand((subcommand) =>
    subcommand
      .setName("personal")
      .setDescription("View your gambling statistics")
      .addUserOption((option) =>
        option.setName("user").setDescription("View another user's gambling stats").setRequired(false),
      ),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("leaderboard")
      .setDescription("View gambling leaderboards")
      .addStringOption((option) =>
        option
          .setName("type")
          .setDescription("Type of leaderboard")
          .setRequired(false)
          .addChoices(
            { name: "Biggest Profit", value: "profit" },
            { name: "Total Won", value: "won" },
            { name: "Total Bet", value: "bet" },
          ),
      )
      .addIntegerOption((option) =>
        option
          .setName("limit")
          .setDescription("Number of users to show (1-20)")
          .setRequired(false)
          .setMinValue(1)
          .setMaxValue(20),
      ),
  )

// Slash command execution
export async function execute(interaction: ChatInputCommandInteraction) {
  const subcommand = interaction.options.getSubcommand()

  try {
    switch (subcommand) {
      case "personal": {
        const targetUser = interaction.options.getUser("user") || interaction.user
        const stats = await getGamblingStats(targetUser.id)

        if (!stats || stats.gamesPlayed === 0) {
          return interaction.reply({
            content: `🎲 ${targetUser.id === interaction.user.id ? "You haven't" : `${targetUser.username} hasn't`} played any gambling games yet!`,
            ephemeral: true,
          })
        }

        const profit = stats.totalWon - stats.totalLost
        const winRate = stats.gamesPlayed > 0 ? ((stats.totalWon / (stats.totalBet || 1)) * 100).toFixed(1) : "0.0"

        const embed = new EmbedBuilder()
          .setTitle(`🎰 ${targetUser.username}'s Gambling Statistics`)
          .setColor(profit >= 0 ? botInfo.colors.success : botInfo.colors.error)
          .setThumbnail(targetUser.displayAvatarURL())
          .addFields(
            { name: "🎮 Games Played", value: stats.gamesPlayed.toString(), inline: true },
            { name: "💰 Total Bet", value: `${stats.totalBet.toLocaleString()} coins`, inline: true },
            { name: "🏆 Total Won", value: `${stats.totalWon.toLocaleString()} coins`, inline: true },
            { name: "💸 Total Lost", value: `${stats.totalLost.toLocaleString()} coins`, inline: true },
            {
              name: "📊 Net Profit/Loss",
              value: `${profit >= 0 ? "+" : ""}${profit.toLocaleString()} coins`,
              inline: true,
            },
            { name: "🎯 Biggest Win", value: `${stats.biggestWin.toLocaleString()} coins`, inline: true },
            { name: "📈 Return Rate", value: `${winRate}%`, inline: true },
            {
              name: "🎲 Risk Level",
              value: stats.totalBet > 50000 ? "🔥 High Roller" : stats.totalBet > 10000 ? "⚡ Regular" : "🌱 Casual",
              inline: true,
            },
          )
          .setFooter({ text: `${config.botName} • Last updated` })
          .setTimestamp(stats.updatedAt)

        await interaction.reply({ embeds: [embed] })
        break
      }

      case "leaderboard": {
        const type = (interaction.options.getString("type") as "profit" | "won" | "bet") || "profit"
        const limit = interaction.options.getInteger("limit") || 10
        const leaderboard = await getGamblingLeaderboard(type, limit)

        if (leaderboard.length === 0) {
          return interaction.reply({ content: "🎰 No gambling data available yet!", ephemeral: true })
        }

        const typeNames = {
          profit: "Biggest Profit",
          won: "Total Won",
          bet: "Total Bet",
        }

        const typeEmojis = {
          profit: "💎",
          won: "🏆",
          bet: "🎲",
        }

        const embed = new EmbedBuilder()
          .setTitle(`${typeEmojis[type]} Gambling Leaderboard - ${typeNames[type]}`)
          .setColor(botInfo.colors.primary)
          .setFooter({ text: `${config.botName} • Showing top ${leaderboard.length} gamblers` })
          .setTimestamp()

        // We need to get usernames for the leaderboard
        const leaderboardWithNames = await Promise.all(
          leaderboard.map(async (entry) => {
            try {
              const user = await interaction.client.users.fetch(entry.userId)
              return { ...entry, username: user.username }
            } catch {
              return { ...entry, username: "Unknown User" }
            }
          }),
        )

        const description = leaderboardWithNames
          .map((entry, index) => {
            const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `${index + 1}.`
            const value =
              type === "profit" && entry.value < 0
                ? `${entry.value.toLocaleString()}`
                : `${entry.value.toLocaleString()}`
            return `${medal} **${entry.username}** - ${value} coins`
          })
          .join("\n")

        embed.setDescription(description)

        await interaction.reply({ embeds: [embed] })
        break
      }
    }
  } catch (error) {
    await interaction.reply({
      content: "❌ An error occurred while fetching gambling statistics.",
      ephemeral: true,
    })
  }
}
