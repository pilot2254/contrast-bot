import { SlashCommandBuilder, type ChatInputCommandInteraction, type Message, EmbedBuilder } from "discord.js"
import { botInfo } from "../../utils/bot-info"
import { getTopPlayers, getPlayerStats } from "../../utils/rps-manager"
import { logger } from "../../utils/logger"

// Slash command definition
export const data = new SlashCommandBuilder()
  .setName("rps-leaderboard")
  .setDescription("Shows the Rock Paper Scissors leaderboard")

// Slash command execution
export async function execute(interaction: ChatInputCommandInteraction) {
  try {
    await interaction.deferReply()

    const topPlayers = await getTopPlayers(10)
    const userStats = await getPlayerStats(interaction.user.id)

    const embed = createLeaderboardEmbed(topPlayers, userStats, interaction.user.id)

    await interaction.editReply({ embeds: [embed] })
  } catch (error) {
    logger.error("Error executing rps-leaderboard command:", error)

    if (interaction.deferred) {
      await interaction.editReply("There was an error while fetching the leaderboard!")
    } else {
      await interaction.reply({ content: "There was an error while fetching the leaderboard!", ephemeral: true })
    }
  }
}

// Prefix command definition
export const name = "rps-leaderboard"
export const aliases = ["rpsleaderboard", "rpslb", "rps-lb", "rps-top"]
export const description = "Shows the Rock Paper Scissors leaderboard"
export const usage = "[sort:winrate|wins|losses|ties] [limit]"

// Prefix command execution
export async function run(message: Message, _args: string[]) {
  try {
    const reply = await message.reply("Fetching leaderboard...")

    const topPlayers = await getTopPlayers(10)
    const userStats = await getPlayerStats(message.author.id)

    const embed = createLeaderboardEmbed(topPlayers, userStats, message.author.id)

    await reply.edit({ content: null, embeds: [embed] })
  } catch (error) {
    logger.error("Error executing rps-leaderboard command:", error)
    await message.reply("There was an error while fetching the leaderboard!")
  }
}

// Helper function to create the leaderboard embed
function createLeaderboardEmbed(topPlayers: any[], userStats: any | null, userId: string) {
  const embed = new EmbedBuilder()
    .setTitle("🎮 Rock Paper Scissors Leaderboard")
    .setColor(botInfo.colors.primary)
    .setTimestamp()
    .setFooter({ text: "Play /rps to climb the leaderboard!" })

  if (topPlayers.length === 0) {
    embed.setDescription("No one has played Rock Paper Scissors yet!")
    return embed
  }

  let leaderboardText = ""

  topPlayers.forEach((player, index) => {
    const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `${index + 1}.`
    const isUser = player.userId === userId ? "👉 " : ""

    leaderboardText += `${isUser}${medal} **${player.username}** - ${player.wins} wins (${player.winRate.toFixed(1)}% win rate)\n`
  })

  embed.setDescription(leaderboardText)

  // Add user's stats if they're not in the top 10
  if (userStats && userStats.totalGames > 0 && !topPlayers.some((player) => player.userId === userId)) {
    embed.addFields({
      name: "Your Stats",
      value: `**${userStats.username}** - ${userStats.wins} wins (${userStats.winRate.toFixed(1)}% win rate)`,
    })
  }

  return embed
}
