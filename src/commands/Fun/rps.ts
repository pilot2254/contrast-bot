import { SlashCommandBuilder, type ChatInputCommandInteraction, EmbedBuilder } from "discord.js"
import { logger } from "../../utils/logger"
import { recordGame, getPlayerStats } from "../../utils/rps-manager"
import { botInfo } from "../../utils/bot-info"

// Define types
type RPSChoice = "rock" | "paper" | "scissors"
type RPSResult = "win" | "loss" | "tie"

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
        { name: "🪨 Rock", value: "rock" },
        { name: "📄 Paper", value: "paper" },
        { name: "✂️ Scissors", value: "scissors" },
      ),
  )

// Slash command execution
export async function execute(interaction: ChatInputCommandInteraction) {
  try {
    const userChoice = interaction.options.getString("choice") as RPSChoice
    const botChoice = getRandomChoice()
    const result = determineWinner(userChoice, botChoice)

    // Record the game
    await recordGame(interaction.user.id, interaction.user.username, result)

    // Get updated stats
    const stats = await getPlayerStats(interaction.user.id)

    // Create and send embed
    const embed = createResultEmbed(interaction.user.username, userChoice, botChoice, result, stats)

    await interaction.reply({ embeds: [embed] })
  } catch (error) {
    logger.error("Error executing rps command:", error)
    await interaction.reply({ content: "There was an error while playing Rock Paper Scissors!", ephemeral: true })
  }
}

// Helper function to get a random choice
function getRandomChoice(): RPSChoice {
  const choices: RPSChoice[] = ["rock", "paper", "scissors"]
  return choices[Math.floor(Math.random() * choices.length)]
}

// Helper function to determine the winner
function determineWinner(userChoice: RPSChoice, botChoice: RPSChoice): RPSResult {
  if (userChoice === botChoice) {
    return "tie"
  }

  if (
    (userChoice === "rock" && botChoice === "scissors") ||
    (userChoice === "paper" && botChoice === "rock") ||
    (userChoice === "scissors" && botChoice === "paper")
  ) {
    return "win"
  }

  return "loss"
}

// Helper function to get emoji for choice
function getChoiceEmoji(choice: RPSChoice): string {
  switch (choice) {
    case "rock":
      return "🪨"
    case "paper":
      return "📄"
    case "scissors":
      return "✂️"
  }
}

// Helper function to get result text
function getResultText(result: RPSResult): string {
  switch (result) {
    case "win":
      return "🏆 You Win!"
    case "loss":
      return "❌ You Lose!"
    default:
      return "🤝 It's a Tie!"
  }
}

// Helper function to get result color
function getResultColor(result: RPSResult): number {
  switch (result) {
    case "win":
      return botInfo.colors.success
    case "loss":
      return botInfo.colors.error
    default:
      return botInfo.colors.primary
  }
}

// Helper function to create the result embed
function createResultEmbed(
  username: string,
  userChoice: RPSChoice,
  botChoice: RPSChoice,
  result: RPSResult,
  stats: any,
) {
  return new EmbedBuilder()
    .setTitle("Rock Paper Scissors")
    .setDescription(`${username} chose ${getChoiceEmoji(userChoice)} vs Bot's ${getChoiceEmoji(botChoice)}`)
    .setColor(getResultColor(result))
    .addFields(
      { name: "Result", value: getResultText(result), inline: false },
      {
        name: "Your Stats",
        value: stats
          ? `Wins: ${stats.wins} | Losses: ${stats.losses} | Ties: ${stats.ties} | Win Rate: ${((stats.wins / stats.totalGames) * 100).toFixed(1)}%`
          : "No stats available",
        inline: false,
      },
    )
    .setFooter({ text: `Played by ${username}` })
    .setTimestamp()
}
