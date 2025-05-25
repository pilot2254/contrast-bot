import { SlashCommandBuilder, type ChatInputCommandInteraction, EmbedBuilder } from "discord.js"
import { botInfo } from "../../utils/bot-info"
import { placeBet, processWin, GAME_TYPES } from "../../utils/gambling-manager"
import { getOrCreateUserEconomy } from "../../utils/economy-manager"

// Game configuration
const GAME_CONFIG = {
  MIN_RANGE: 2,
  MAX_RANGE: 100000,
  MIN_BET: 1,
  MAX_BET: 1000000,
  // Multipliers are slightly less than the range to give house edge
  MULTIPLIER_RATIO: 0.95, // 95% of the range size
}

// Slash command definition
export const data = new SlashCommandBuilder()
  .setName("number-guess")
  .setDescription("Guess a number within a range - with optional betting!")
  .addIntegerOption((option) =>
    option
      .setName("range")
      .setDescription("The range of numbers (2-100)")
      .setRequired(true)
      .setMinValue(GAME_CONFIG.MIN_RANGE)
      .setMaxValue(GAME_CONFIG.MAX_RANGE),
  )
  .addIntegerOption((option) =>
    option.setName("guess").setDescription("Your number guess").setRequired(true).setMinValue(1),
  )
  .addIntegerOption((option) =>
    option
      .setName("bet")
      .setDescription("Amount to bet (optional)")
      .setRequired(false)
      .setMinValue(GAME_CONFIG.MIN_BET)
      .setMaxValue(GAME_CONFIG.MAX_BET),
  )

// Slash command execution
export async function execute(interaction: ChatInputCommandInteraction) {
  const range = interaction.options.getInteger("range", true)
  const guess = interaction.options.getInteger("guess", true)
  const betAmount = interaction.options.getInteger("bet")

  // Validate guess is within range
  if (guess < 1 || guess > range) {
    return interaction.reply({
      content: `❌ Your guess must be between 1 and ${range}!`,
      ephemeral: true,
    })
  }

  try {
    // Handle betting if specified
    let isBetting = false
    if (betAmount) {
      const betResult = await placeBet(
        interaction.user.id,
        interaction.user.username,
        betAmount,
        GAME_TYPES.NUMBER_GUESS,
      )

      if (!betResult.success) {
        return interaction.reply({
          content: `❌ ${betResult.message}`,
          ephemeral: true,
        })
      }
      isBetting = true
    }

    // Generate random number
    const winningNumber = Math.floor(Math.random() * range) + 1
    const isWin = guess === winningNumber

    // Calculate multiplier and potential winnings
    const multiplier = Math.floor(range * GAME_CONFIG.MULTIPLIER_RATIO)
    const winnings = isBetting && isWin && betAmount ? betAmount * multiplier : 0

    // Process winnings if betting and won
    if (isBetting && isWin && betAmount) {
      await processWin(interaction.user.id, interaction.user.username, betAmount, winnings, GAME_TYPES.NUMBER_GUESS)
    }

    // Get updated balance
    const economy = await getOrCreateUserEconomy(interaction.user.id, interaction.user.username)

    // Create result embed
    const embed = createResultEmbed(
      interaction.user.username,
      range,
      guess,
      winningNumber,
      isWin,
      isBetting,
      betAmount || 0,
      winnings,
      multiplier,
      economy.balance,
    )

    await interaction.reply({ embeds: [embed] })
  } catch (error) {
    await interaction.reply({
      content: "❌ An error occurred while processing your guess!",
      ephemeral: true,
    })
  }
}

// Helper function to create result embed
function createResultEmbed(
  username: string,
  range: number,
  guess: number,
  winningNumber: number,
  isWin: boolean,
  isBetting: boolean,
  betAmount: number,
  winnings: number,
  multiplier: number,
  newBalance: number,
): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle("🎲 Number Guessing Game")
    .setColor(isWin ? botInfo.colors.success : botInfo.colors.error)
    .addFields(
      { name: "🎯 Range", value: `1-${range}`, inline: true },
      { name: "🤔 Your Guess", value: guess.toString(), inline: true },
      { name: "🎰 Winning Number", value: winningNumber.toString(), inline: true },
    )
    .setFooter({ text: `Played by ${username}` })
    .setTimestamp()

  if (isWin) {
    embed.setDescription("🎉 **WINNER!** 🎉\nYou guessed the correct number!")

    if (isBetting) {
      embed.addFields(
        { name: "💰 Bet Amount", value: `${betAmount.toLocaleString()} coins`, inline: true },
        { name: "🎊 Winnings", value: `${winnings.toLocaleString()} coins`, inline: true },
        { name: "📈 Profit", value: `${(winnings - betAmount).toLocaleString()} coins`, inline: true },
        { name: "💵 New Balance", value: `${newBalance.toLocaleString()} coins`, inline: true },
        { name: "⚡ Multiplier", value: `${multiplier}x`, inline: true },
      )
    } else {
      embed.addFields({
        name: "💡 Tip",
        value: `Add a bet next time to win coins! This would have been a ${multiplier}x multiplier!`,
        inline: false,
      })
    }
  } else {
    embed.setDescription("❌ **Better luck next time!**\nYou didn't guess the correct number.")

    if (isBetting) {
      embed.addFields(
        { name: "💸 Lost", value: `${betAmount.toLocaleString()} coins`, inline: true },
        { name: "💵 New Balance", value: `${newBalance.toLocaleString()} coins`, inline: true },
        {
          name: "🎯 Potential Win",
          value: `${(betAmount * multiplier).toLocaleString()} coins (${multiplier}x)`,
          inline: true,
        },
      )
    } else {
      embed.addFields({
        name: "💡 Tip",
        value: `Try adding a bet to make it more exciting! Range 1-${range} has a ${multiplier}x multiplier!`,
        inline: false,
      })
    }
  }

  // Add game info
  embed.addFields({
    name: "📊 Game Info",
    value: `Range: 1-${range} • Multiplier: ${multiplier}x • Win Chance: ${(100 / range).toFixed(1)}%`,
    inline: false,
  })

  return embed
}