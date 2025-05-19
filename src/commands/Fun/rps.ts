import { SlashCommandBuilder, type ChatInputCommandInteraction, type Message, EmbedBuilder } from "discord.js"
import { botInfo } from "../../utils/bot-info"
import { type RPSChoice, getBotChoice, determineResult, recordGame, getPlayerStats } from "../../utils/rps-manager"

// Slash command definition
export const data = new SlashCommandBuilder()
  .setName("rps")
  .setDescription("Play Rock Paper Scissors against the bot")
  .addStringOption((option) =>
    option
      .setName("choice")
      .setDescription("Your choice")
      .setRequired(true)
      .addChoices(
        { name: "Rock", value: "rock" },
        { name: "Paper", value: "paper" },
        { name: "Scissors", value: "scissors" },
      ),
  )

// Slash command execution
export async function execute(interaction: ChatInputCommandInteraction) {
  const playerChoice = interaction.options.getString("choice") as RPSChoice
  const botChoice = getBotChoice()
  const result = determineResult(playerChoice, botChoice)

  // Get bot user
  const botUser = interaction.client.user

  // Record the game
  await recordGame(
    interaction.user.id,
    interaction.user.username,
    botUser?.id || "unknown",
    botUser?.tag || "Bot",
    result,
  )

  // Get player stats
  const playerStats = await getPlayerStats(interaction.user.id)

  // Create embed
  const embed = new EmbedBuilder()
    .setTitle("Rock Paper Scissors")
    .setColor(getResultColor(result))
    .addFields(
      { name: "Your Choice", value: formatChoice(playerChoice), inline: true },
      { name: "Bot's Choice", value: formatChoice(botChoice), inline: true },
      { name: "Result", value: formatResult(result), inline: true },
    )
    .setFooter({ text: `Your Stats: ${playerStats?.wins}W ${playerStats?.losses}L ${playerStats?.ties}T` })
    .setTimestamp()

  await interaction.reply({ embeds: [embed] })
}

// Prefix command definition
export const name = "rps"
export const aliases = ["rockpaperscissors"]
export const description = "Play Rock Paper Scissors against the bot"
export const usage = "<rock|paper|scissors>"

// Prefix command execution
export async function run(message: Message, args: string[]) {
  if (!args.length) {
    return message.reply(`Usage: ${usage}`)
  }

  const input = args[0].toLowerCase()
  let playerChoice: RPSChoice

  // Validate input
  if (input === "rock" || input === "r") {
    playerChoice = "rock"
  } else if (input === "paper" || input === "p") {
    playerChoice = "paper"
  } else if (input === "scissors" || input === "s") {
    playerChoice = "scissors"
  } else {
    return message.reply("Invalid choice. Please choose rock, paper, or scissors.")
  }

  const botChoice = getBotChoice()
  const result = determineResult(playerChoice, botChoice)

  // Get bot user
  const botUser = message.client.user

  // Record the game
  await recordGame(message.author.id, message.author.username, botUser?.id || "unknown", botUser?.tag || "Bot", result)

  // Get player stats
  const playerStats = await getPlayerStats(message.author.id)

  // Create embed
  const embed = new EmbedBuilder()
    .setTitle("Rock Paper Scissors")
    .setColor(getResultColor(result))
    .addFields(
      { name: "Your Choice", value: formatChoice(playerChoice), inline: true },
      { name: "Bot's Choice", value: formatChoice(botChoice), inline: true },
      { name: "Result", value: formatResult(result), inline: true },
    )
    .setFooter({ text: `Your Stats: ${playerStats?.wins}W ${playerStats?.losses}L ${playerStats?.ties}T` })
    .setTimestamp()

  await message.reply({ embeds: [embed] })
}

// Helper function to get color based on result
function getResultColor(result: string): number {
  switch (result) {
    case "win":
      return botInfo.colors.success
    case "loss":
      return botInfo.colors.error
    default:
      return botInfo.colors.primary
  }
}

// Helper function to format choice with emoji
function formatChoice(choice: RPSChoice): string {
  switch (choice) {
    case "rock":
      return "🪨 Rock"
    case "paper":
      return "📄 Paper"
    case "scissors":
      return "✂️ Scissors"
  }
}

// Helper function to format result
function formatResult(result: string): string {
  switch (result) {
    case "win":
      return "🏆 You Win!"
    case "loss":
      return "❌ You Lose!"
    default:
      return "🤝 It's a Tie!"
  }
}
