import { SlashCommandBuilder, type ChatInputCommandInteraction, type Message, EmbedBuilder } from "discord.js"
import { botInfo } from "../../utils/bot-info"
import { getTopPlayers, getPlayerStats } from "../../utils/rps-manager"

// Slash command definition
export const data = new SlashCommandBuilder()
  .setName("rps-leaderboard")
  .setDescription("Shows the Rock Paper Scissors leaderboard")
  .addStringOption((option) =>
    option
      .setName("sort")
      .setDescription("Sort criteria")
      .setRequired(false)
      .addChoices(
        { name: "Win Rate", value: "winrate" },
        { name: "Wins", value: "wins" },
        { name: "Losses", value: "losses" },
        { name: "Ties", value: "ties" },
      ),
  )
  .addIntegerOption((option) =>
    option
      .setName("limit")
      .setDescription("Number of players to show (default: 10)")
      .setRequired(false)
      .setMinValue(1)
      .setMaxValue(25),
  )

// Slash command execution
export async function execute(interaction: ChatInputCommandInteraction) {
  const limit = interaction.options.getInteger("limit") || 10
  const sortBy = interaction.options.getString("sort") || "winrate"
  const topPlayers = await getTopPlayers(sortBy, limit)
  const userStats = await getPlayerStats(interaction.user.id)

  if (topPlayers.length === 0) {
    return interaction.reply("No one has played Rock Paper Scissors yet!")
  }

  const embed = new EmbedBuilder()
    .setTitle("Rock Paper Scissors Leaderboard")
    .setDescription(`Top players sorted by ${formatSortCriteria(sortBy)}`)
    .setColor(botInfo.colors.primary)
    .setFooter({ text: `Requested by ${interaction.user.tag}` })
    .setTimestamp()

  // Add top players
  let leaderboardText = ""
  topPlayers.forEach((player, index) => {
    const winRate = ((player.wins / player.totalGames) * 100).toFixed(1)
    leaderboardText += `**${index + 1}.** ${player.username} - ${winRate}% Win Rate (${player.wins}W ${player.losses}L ${player.ties}T)\n`
  })

  embed.addFields({ name: "Top Players", value: leaderboardText, inline: false })

  // Add user's stats if they've played and aren't already in the top players
  if (userStats && userStats.totalGames > 0 && !topPlayers.some((player) => player.userId === interaction.user.id)) {
    const userWinRate = ((userStats.wins / userStats.totalGames) * 100).toFixed(1)
    embed.addFields({
      name: "Your Stats",
      value: `Wins: ${userStats.wins} | Losses: ${userStats.losses} | Ties: ${userStats.ties} | Win Rate: ${userWinRate}%`,
      inline: false,
    })
  }

  await interaction.reply({ embeds: [embed] })
}

// Prefix command definition
export const name = "rps-leaderboard"
export const aliases = ["rpsleaderboard", "rpslb", "rps-lb"]
export const description = "Shows the Rock Paper Scissors leaderboard"
export const usage = "[sort:winrate|wins|losses|ties] [limit]"

// Prefix command execution
export async function run(message: Message, args: string[]) {
  // Parse arguments
  let sortBy = "winrate"
  let limit = 10

  if (args.length > 0) {
    // Check if first arg is a sort option
    const validSortOptions = ["winrate", "wins", "losses", "ties"]
    if (validSortOptions.includes(args[0].toLowerCase())) {
      sortBy = args[0].toLowerCase()
      args.shift() // Remove the sort option from args
    }

    // Check if next arg is a limit
    if (args.length > 0 && !isNaN(Number(args[0]))) {
      limit = Math.min(Math.max(Number(args[0]), 1), 25)
    }
  }

  const topPlayers = await getTopPlayers(sortBy, limit)
  const userStats = await getPlayerStats(message.author.id)

  if (topPlayers.length === 0) {
    return message.reply("No one has played Rock Paper Scissors yet!")
  }

  const embed = new EmbedBuilder()
    .setTitle("Rock Paper Scissors Leaderboard")
    .setDescription(`Top players sorted by ${formatSortCriteria(sortBy)}`)
    .setColor(botInfo.colors.primary)
    .setFooter({ text: `Requested by ${message.author.tag}` })
    .setTimestamp()

  // Add top players
  let leaderboardText = ""
  topPlayers.forEach((player, index) => {
    const winRate = ((player.wins / player.totalGames) * 100).toFixed(1)
    leaderboardText += `**${index + 1}.** ${player.username} - ${winRate}% Win Rate (${player.wins}W ${player.losses}L ${player.ties}T)\n`
  })

  embed.addFields({ name: "Top Players", value: leaderboardText, inline: false })

  // Add user's stats if they've played and aren't already in the top players
  if (userStats && userStats.totalGames > 0 && !topPlayers.some((player) => player.userId === message.author.id)) {
    const userWinRate = ((userStats.wins / userStats.totalGames) * 100).toFixed(1)
    embed.addFields({
      name: "Your Stats",
      value: `Wins: ${userStats.wins} | Losses: ${userStats.losses} | Ties: ${userStats.ties} | Win Rate: ${userWinRate}%`,
      inline: false,
    })
  }

  await message.reply({ embeds: [embed] })
}

// Helper function to format sort criteria for display
function formatSortCriteria(sortBy: string): string {
  switch (sortBy.toLowerCase()) {
    case "wins":
      return "Most Wins"
    case "losses":
      return "Most Losses"
    case "ties":
      return "Most Ties"
    case "winrate":
    default:
      return "Win Rate"
  }
}
