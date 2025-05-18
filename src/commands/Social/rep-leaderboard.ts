import { SlashCommandBuilder, type ChatInputCommandInteraction, type Message, EmbedBuilder } from "discord.js"
import { botInfo } from "../../utils/bot-info"
import { getTopUsers, getUserReputation } from "../../utils/reputation-manager"

// Slash command definition
export const data = new SlashCommandBuilder()
  .setName("rep-leaderboard")
  .setDescription("Shows the reputation leaderboard")
  .addStringOption((option) =>
    option
      .setName("sort")
      .setDescription("Sort criteria")
      .setRequired(false)
      .addChoices(
        { name: "Received Total", value: "receivedTotal" },
        { name: "Received Positive", value: "receivedPositive" },
        { name: "Received Negative", value: "receivedNegative" },
        { name: "Given Total", value: "givenTotal" },
        { name: "Given Positive", value: "givenPositive" },
        { name: "Given Negative", value: "givenNegative" },
      ),
  )
  .addIntegerOption((option) =>
    option
      .setName("limit")
      .setDescription("Number of users to show (default: 10)")
      .setRequired(false)
      .setMinValue(1)
      .setMaxValue(25),
  )

// Slash command execution
export async function execute(interaction: ChatInputCommandInteraction) {
  const limit = interaction.options.getInteger("limit") || 10
  const sortBy = interaction.options.getString("sort") || "receivedTotal"
  const topUsers = getTopUsers(sortBy, limit)
  const userRep = getUserReputation(interaction.user.id)

  if (topUsers.length === 0) {
    return interaction.reply("No one has received or given any reputation yet!")
  }

  const embed = new EmbedBuilder()
    .setTitle("Reputation Leaderboard")
    .setDescription(`Top users sorted by ${formatSortCriteria(sortBy)}`)
    .setColor(botInfo.colors.primary)
    .setFooter({ text: `Requested by ${interaction.user.tag}` })
    .setTimestamp()

  // Add top users
  let leaderboardText = ""
  topUsers.forEach((user, index) => {
    const receivedTotal = user.receivedPositive - user.receivedNegative
    const givenTotal = user.givenPositive - user.givenNegative

    leaderboardText += `**${index + 1}.** ${user.username}\n`
    leaderboardText += `Received: +${user.receivedPositive} / -${user.receivedNegative} / Total: ${receivedTotal}\n`
    leaderboardText += `Given: +${user.givenPositive} / -${user.givenNegative} / Total: ${givenTotal}\n\n`
  })

  embed.addFields({ name: "Top Users", value: leaderboardText, inline: false })

  // Add user's stats if they have reputation and aren't already in the top users
  if (userRep && !topUsers.some((user) => user.userId === interaction.user.id)) {
    const receivedTotal = userRep.receivedPositive - userRep.receivedNegative
    const givenTotal = userRep.givenPositive - userRep.givenNegative

    embed.addFields({
      name: "Your Stats",
      value: `Received: +${userRep.receivedPositive} / -${userRep.receivedNegative} / Total: ${receivedTotal}\nGiven: +${userRep.givenPositive} / -${userRep.givenNegative} / Total: ${givenTotal}`,
      inline: false,
    })
  }

  await interaction.reply({ embeds: [embed] })
}

// Prefix command definition
export const name = "rep-leaderboard"
export const aliases = ["repleaderboard", "replb", "rep-lb"]
export const description = "Shows the reputation leaderboard"
export const usage =
  "[sort:receivedTotal|receivedPositive|receivedNegative|givenTotal|givenPositive|givenNegative] [limit]"

// Prefix command execution
export async function run(message: Message, args: string[]) {
  // Parse arguments
  let sortBy = "receivedTotal"
  let limit = 10

  if (args.length > 0) {
    // Check if first arg is a sort option
    const validSortOptions = [
      "receivedtotal",
      "receivedpositive",
      "receivednegative",
      "giventotal",
      "givenpositive",
      "givennegative",
    ]

    const firstArg = args[0].toLowerCase()
    if (validSortOptions.includes(firstArg)) {
      sortBy = firstArg
      args.shift() // Remove the sort option from args
    }

    // Check if next arg is a limit
    if (args.length > 0 && !isNaN(Number(args[0]))) {
      limit = Math.min(Math.max(Number(args[0]), 1), 25)
    }
  }

  const topUsers = getTopUsers(sortBy, limit)
  const userRep = getUserReputation(message.author.id)

  if (topUsers.length === 0) {
    return message.reply("No one has received or given any reputation yet!")
  }

  const embed = new EmbedBuilder()
    .setTitle("Reputation Leaderboard")
    .setDescription(`Top users sorted by ${formatSortCriteria(sortBy)}`)
    .setColor(botInfo.colors.primary)
    .setFooter({ text: `Requested by ${message.author.tag}` })
    .setTimestamp()

  // Add top users
  let leaderboardText = ""
  topUsers.forEach((user, index) => {
    const receivedTotal = user.receivedPositive - user.receivedNegative
    const givenTotal = user.givenPositive - user.givenNegative

    leaderboardText += `**${index + 1}.** ${user.username}\n`
    leaderboardText += `Received: +${user.receivedPositive} / -${user.receivedNegative} / Total: ${receivedTotal}\n`
    leaderboardText += `Given: +${user.givenPositive} / -${user.givenNegative} / Total: ${givenTotal}\n\n`
  })

  embed.addFields({ name: "Top Users", value: leaderboardText, inline: false })

  // Add user's stats if they have reputation and aren't already in the top users
  if (userRep && !topUsers.some((user) => user.userId === message.author.id)) {
    const receivedTotal = userRep.receivedPositive - userRep.receivedNegative
    const givenTotal = userRep.givenPositive - userRep.givenNegative

    embed.addFields({
      name: "Your Stats",
      value: `Received: +${userRep.receivedPositive} / -${userRep.receivedNegative} / Total: ${receivedTotal}\nGiven: +${userRep.givenPositive} / -${userRep.givenNegative} / Total: ${givenTotal}`,
      inline: false,
    })
  }

  await message.reply({ embeds: [embed] })
}

// Helper function to format sort criteria for display
function formatSortCriteria(sortBy: string): string {
  switch (sortBy.toLowerCase()) {
    case "receivedpositive":
      return "Most Positive Reputation Received"
    case "receivednegative":
      return "Most Negative Reputation Received"
    case "receivedtotal":
      return "Highest Total Reputation Received"
    case "givenpositive":
      return "Most Positive Reputation Given"
    case "givennegative":
      return "Most Negative Reputation Given"
    case "giventotal":
      return "Highest Total Reputation Given"
    default:
      return "Highest Total Reputation Received"
  }
}