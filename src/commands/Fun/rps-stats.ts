import { SlashCommandBuilder, type ChatInputCommandInteraction, type Message, EmbedBuilder } from "discord.js"
import { botInfo } from "../../utils/bot-info"
import { getPlayerStats } from "../../utils/rps-manager"

// Slash command definition
export const data = new SlashCommandBuilder()
  .setName("rps-stats")
  .setDescription("View Rock Paper Scissors statistics for a user")
  .addUserOption((option) =>
    option.setName("user").setDescription("The user to check stats for (defaults to yourself)").setRequired(false),
  )

// Slash command execution
export async function execute(interaction: ChatInputCommandInteraction) {
  const targetUser = interaction.options.getUser("user") || interaction.user
  const stats = getPlayerStats(targetUser.id)

  if (!stats || stats.totalGames === 0) {
    return interaction.reply({
      content: `${targetUser.id === interaction.user.id ? "You haven't" : `${targetUser.username} hasn't`} played any Rock Paper Scissors games yet.`,
      ephemeral: true,
    })
  }

  // Calculate statistics
  const winRate = ((stats.wins / stats.totalGames) * 100).toFixed(2)
  const lossRate = ((stats.losses / stats.totalGames) * 100).toFixed(2)
  const tieRate = ((stats.ties / stats.totalGames) * 100).toFixed(2)
  const lastPlayed = new Date(stats.lastUpdated).toISOString()

  const embed = new EmbedBuilder()
    .setTitle(`${targetUser.username}'s RPS Statistics`)
    .setColor(botInfo.colors.primary)
    .setThumbnail(targetUser.displayAvatarURL({ size: 128 }))
    .addFields(
      { name: "Total Games", value: stats.totalGames.toString(), inline: true },
      { name: "Wins", value: `${stats.wins} (${winRate}%)`, inline: true },
      { name: "Losses", value: `${stats.losses} (${lossRate}%)`, inline: true },
      { name: "Ties", value: `${stats.ties} (${tieRate}%)`, inline: true },
      { name: "Win/Loss Ratio", value: stats.losses > 0 ? (stats.wins / stats.losses).toFixed(2) : "∞", inline: true },
      { name: "Last Played", value: `<t:${Math.floor(stats.lastUpdated / 1000)}:R>`, inline: true },
    )
    .setFooter({ text: `Requested by ${interaction.user.tag}` })
    .setTimestamp()

  await interaction.reply({ embeds: [embed] })
}

// Prefix command definition
export const name = "rps-stats"
export const aliases = ["rpsstats", "rps-profile"]
export const description = "View Rock Paper Scissors statistics for a user"
export const usage = "[user]"

// Prefix command execution
export async function run(message: Message, args: string[]) {
  // Determine target user
  let targetUser = message.author
  if (args.length > 0 && message.mentions.users.size > 0) {
    targetUser = message.mentions.users.first()!
  }

  const stats = getPlayerStats(targetUser.id)

  if (!stats || stats.totalGames === 0) {
    return message.reply(
      `${targetUser.id === message.author.id ? "You haven't" : `${targetUser.username} hasn't`} played any Rock Paper Scissors games yet.`,
    )
  }

  // Calculate statistics
  const winRate = ((stats.wins / stats.totalGames) * 100).toFixed(2)
  const lossRate = ((stats.losses / stats.totalGames) * 100).toFixed(2)
  const tieRate = ((stats.ties / stats.totalGames) * 100).toFixed(2)
  const lastPlayed = new Date(stats.lastUpdated).toISOString()

  const embed = new EmbedBuilder()
    .setTitle(`${targetUser.username}'s RPS Statistics`)
    .setColor(botInfo.colors.primary)
    .setThumbnail(targetUser.displayAvatarURL({ size: 128 }))
    .addFields(
      { name: "Total Games", value: stats.totalGames.toString(), inline: true },
      { name: "Wins", value: `${stats.wins} (${winRate}%)`, inline: true },
      { name: "Losses", value: `${stats.losses} (${lossRate}%)`, inline: true },
      { name: "Ties", value: `${stats.ties} (${tieRate}%)`, inline: true },
      { name: "Win/Loss Ratio", value: stats.losses > 0 ? (stats.wins / stats.losses).toFixed(2) : "∞", inline: true },
      { name: "Last Played", value: `<t:${Math.floor(stats.lastUpdated / 1000)}:R>`, inline: true },
    )
    .setFooter({ text: `Requested by ${message.author.tag}` })
    .setTimestamp()

  await message.reply({ embeds: [embed] })
}