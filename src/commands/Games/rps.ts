import { SlashCommandBuilder, type ChatInputCommandInteraction, EmbedBuilder } from "discord.js"
import { logger } from "../../utils/logger"
import { recordGame, getPlayerStats } from "../../utils/rps-manager"
import { botInfo } from "../../utils/bot-info"
import { placeBet, processWin, GAME_TYPES } from "../../utils/gambling-manager"
import { getOrCreateUserEconomy } from "../../utils/economy-manager"

// Define types
type RPSChoice = "rock" | "paper" | "scissors"
type RPSResult = "win" | "loss" | "tie"

// Slash command definition
export const data = new SlashCommandBuilder()
  .setName("rps")
  .setDescription("Play Rock Paper Scissors against the bot - with optional betting!")
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
  .addIntegerOption((option) =>
    option
      .setName("bet")
      .setDescription("Amount to bet (optional)")
      .setRequired(false)
      .setMinValue(1)
      .setMaxValue(10000),
  )

// Slash command execution
export async function execute(interaction: ChatInputCommandInteraction) {
  try {
    const userChoice = interaction.options.getString("choice") as RPSChoice
    const betAmount = interaction.options.getInteger("bet")
    const botChoice = getRandomChoice()
    const result = determineWinner(userChoice, botChoice)

    // Handle betting if specified
    let isBetting = false
    if (betAmount) {
      const betResult = await placeBet(interaction.user.id, interaction.user.username, betAmount, GAME_TYPES.RPS)

      if (!betResult.success) {
        return interaction.reply({
          content: `❌ ${betResult.message}`,
          ephemeral: true,
        })
      }
      isBetting = true
    }

    // Calculate winnings (2x multiplier for RPS wins)
    const winnings = isBetting && result === "win" ? betAmount * 2 : 0

    // Process winnings if betting and won
    if (isBetting && result === "win") {
      await processWin(interaction.user.id, interaction.user.username, betAmount, winnings, GAME_TYPES.RPS)
    }

    // Record the game (existing functionality)
    await recordGame(interaction.user.id, interaction.user.username, result)

    // Get updated stats and balance
    const stats = await getPlayerStats(interaction.user.id)
    const economy = await getOrCreateUserEconomy(interaction.user.id, interaction.user.username)

    // Create and send embed
    const embed = createResultEmbed(
      interaction.user.username,
      userChoice,
      botChoice,
      result,
      stats,
      isBetting,
      betAmount || 0,
      winnings,
      economy.balance,
    )

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
  isBetting: boolean,
  betAmount: number,
  winnings: number,
  newBalance: number,
) {
  const embed = new EmbedBuilder()
    .setTitle("Rock Paper Scissors")
    .setDescription(`${username} chose ${getChoiceEmoji(userChoice)} vs Bot's ${getChoiceEmoji(botChoice)}`)
    .setColor(getResultColor(result))
    .addFields({ name: "Result", value: getResultText(result), inline: false })
    .setFooter({ text: `Played by ${username}` })
    .setTimestamp()

  // Add betting information if applicable
  if (isBetting) {
    if (result === "win") {
      embed.addFields(
        { name: "💰 Bet Amount", value: `${betAmount.toLocaleString()} coins`, inline: true },
        { name: "🎊 Winnings", value: `${winnings.toLocaleString()} coins`, inline: true },
        { name: "📈 Profit", value: `${(winnings - betAmount).toLocaleString()} coins`, inline: true },
      )
    } else if (result === "loss") {
      embed.addFields({ name: "💸 Lost", value: `${betAmount.toLocaleString()} coins`, inline: true })
    } else {
      embed.addFields({ name: "🤝 Tie", value: "No coins lost or won", inline: true })
    }

    embed.addFields({ name: "💵 New Balance", value: `${newBalance.toLocaleString()} coins`, inline: true })
  } else {
    embed.addFields({
      name: "💡 Tip",
      value: "Add a bet next time to win coins! Wins pay 2x your bet!",
      inline: false,
    })
  }

  // Add stats
  if (stats) {
    embed.addFields({
      name: "Your RPS Stats",
      value: `Wins: ${stats.wins} | Losses: ${stats.losses} | Ties: ${stats.ties} | Win Rate: ${((stats.wins / stats.totalGames) * 100).toFixed(1)}%`,
      inline: false,
    })
  }

  return embed
}
