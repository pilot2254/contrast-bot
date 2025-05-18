import { SlashCommandBuilder, type ChatInputCommandInteraction, type Message, EmbedBuilder } from "discord.js"
import { botInfo } from "../../utils/bot-info"
import { getTopPlayers, getPlayerStats } from "../../utils/rps-manager"

// Slash command definition
export const data = new SlashCommandBuilder()
  .setName("rps-leaderboard")
  .setDescription("Shows the Rock Paper Scissors leaderboard")
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
  const topPlayers = getTopPlayers(limit)
  const userStats = getPlayerStats(interaction.user.id)

  if (topPlayers.length === 0) {
    return interaction.reply("No one has played Rock Paper Scissors yet!")
  }

  const embed = new EmbedBuilder()
    .setTitle("Rock Paper Scissors Leaderboard")
    .setDescription("Top players by win rate")
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
export const usage = "[limit]"

// Prefix command execution
export async function run(message: Message, args: string[]) {
  const limit = args.length > 0 && !isNaN(Number(args[0])) ? Math.min(Math.max(Number(args[0]), 1), 25) : 10
  const topPlayers = getTopPlayers(limit)
  const userStats = getPlayerStats(message.author.id)

  if (topPlayers.length === 0) {
    return message.reply("No one has played Rock Paper Scissors yet!")
  }

  const embed = new EmbedBuilder()
    .setTitle("Rock Paper Scissors Leaderboard")
    .setDescription("Top players by win rate")
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