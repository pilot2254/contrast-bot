import { SlashCommandBuilder, type ChatInputCommandInteraction, EmbedBuilder } from "discord.js"
import { botInfo } from "../../utils/bot-info"
import { placeBet, processWin, GAME_TYPES } from "../../utils/gambling-manager"
import { getOrCreateUserEconomy } from "../../utils/economy-manager"

// Game configuration
const DICE_CONFIG = {
  MIN_DICE: 1,
  MAX_DICE: 3,
  MIN_BET: 1,
  MAX_BET: 1000000,
}

// Multiplier configurations for different bet types
const MULTIPLIERS = {
  // Single die exact number (1-6)
  single_exact: 6,
  // Two dice exact sum
  two_exact: {
    2: 36,
    12: 36, // Hardest to roll
    3: 18,
    11: 18, // Second hardest
    4: 12,
    10: 12, // Third hardest
    5: 9,
    9: 9, // Fourth hardest
    6: 7.2,
    8: 7.2, // Fifth hardest
    7: 6, // Most common (lowest multiplier)
  },
  // Three dice exact sum
  three_exact: {
    3: 216,
    18: 216, // Hardest to roll
    4: 108,
    17: 108, // Second hardest
    5: 72,
    16: 72, // Third hardest
    6: 54,
    15: 54, // Fourth hardest
    7: 43.2,
    14: 43.2, // Fifth hardest
    8: 36,
    13: 36, // Sixth hardest
    9: 32.4,
    12: 32.4, // Seventh hardest
    10: 30,
    11: 30, // Most common (lowest multiplier)
  },
  // Range bets (less risky, lower multiplier)
  range_low: 2, // 1-3 on single die, low half on multi-dice
  range_high: 2, // 4-6 on single die, high half on multi-dice
  odd: 2, // Odd sum
  even: 2, // Even sum
}

// Slash command definition
export const data = new SlashCommandBuilder()
  .setName("dice-roll")
  .setDescription("Roll dice and predict the outcome - with optional betting!")
  .addIntegerOption((option) =>
    option
      .setName("dice")
      .setDescription("Number of dice to roll (1-3)")
      .setRequired(true)
      .setMinValue(DICE_CONFIG.MIN_DICE)
      .setMaxValue(DICE_CONFIG.MAX_DICE),
  )
  .addStringOption((option) =>
    option
      .setName("bet-type")
      .setDescription("What to bet on")
      .setRequired(false)
      .addChoices(
        { name: "Exact Number/Sum", value: "exact" },
        { name: "Low Range", value: "low" },
        { name: "High Range", value: "high" },
        { name: "Odd Sum", value: "odd" },
        { name: "Even Sum", value: "even" },
      ),
  )
  .addIntegerOption((option) =>
    option
      .setName("prediction")
      .setDescription("Your exact number/sum prediction (if betting exact)")
      .setRequired(false),
  )
  .addIntegerOption((option) =>
    option
      .setName("bet")
      .setDescription("Amount to bet (optional)")
      .setRequired(false)
      .setMinValue(DICE_CONFIG.MIN_BET)
      .setMaxValue(DICE_CONFIG.MAX_BET),
  )

// Slash command execution
export async function execute(interaction: ChatInputCommandInteraction) {
  const numDice = interaction.options.getInteger("dice", true)
  const betType = interaction.options.getString("bet-type")
  const prediction = interaction.options.getInteger("prediction")
  const betAmount = interaction.options.getInteger("bet")

  // Validate betting parameters
  if (betAmount && !betType) {
    return interaction.reply({
      content: "❌ You must choose a bet type when placing a bet!",
      ephemeral: true,
    })
  }

  if (betType === "exact" && !prediction) {
    return interaction.reply({
      content: "❌ You must provide a prediction when betting on exact numbers!",
      ephemeral: true,
    })
  }

  // Validate prediction ranges
  if (prediction) {
    const minSum = numDice
    const maxSum = numDice * 6
    if (prediction < minSum || prediction > maxSum) {
      return interaction.reply({
        content: `❌ Prediction must be between ${minSum} and ${maxSum} for ${numDice} dice!`,
        ephemeral: true,
      })
    }
  }

  try {
    // Handle betting if specified
    let isBetting = false
    if (betAmount && betType) {
      const betResult = await placeBet(interaction.user.id, interaction.user.username, betAmount, GAME_TYPES.DICE_ROLL)

      if (!betResult.success) {
        return interaction.reply({
          content: `❌ ${betResult.message}`,
          ephemeral: true,
        })
      }
      isBetting = true
    }

    // Roll the dice
    const rolls = []
    for (let i = 0; i < numDice; i++) {
      rolls.push(Math.floor(Math.random() * 6) + 1)
    }
    const sum = rolls.reduce((a, b) => a + b, 0)

    // Determine if user won and calculate multiplier
    let isWin = false
    let multiplier = 0

    if (isBetting && betType) {
      switch (betType) {
        case "exact":
          if (numDice === 1) {
            isWin = prediction === rolls[0]
            multiplier = MULTIPLIERS.single_exact
          } else if (numDice === 2) {
            isWin = prediction === sum
            multiplier = (MULTIPLIERS.two_exact as any)[sum] || 6
          } else if (numDice === 3) {
            isWin = prediction === sum
            multiplier = (MULTIPLIERS.three_exact as any)[sum] || 30
          }
          break
        case "low":
          if (numDice === 1) {
            isWin = rolls[0] <= 3
          } else {
            isWin = sum <= numDice * 3.5
          }
          multiplier = MULTIPLIERS.range_low
          break
        case "high":
          if (numDice === 1) {
            isWin = rolls[0] >= 4
          } else {
            isWin = sum > numDice * 3.5
          }
          multiplier = MULTIPLIERS.range_high
          break
        case "odd":
          isWin = sum % 2 === 1
          multiplier = MULTIPLIERS.odd
          break
        case "even":
          isWin = sum % 2 === 0
          multiplier = MULTIPLIERS.even
          break
      }
    }

    // Calculate winnings
    let winnings = 0
    if (isBetting && betAmount && isWin) {
      winnings = Math.floor(betAmount * multiplier)
    }

    // Process winnings if betting and won
    if (isBetting && betAmount && isWin) {
      await processWin(interaction.user.id, interaction.user.username, betAmount, winnings, GAME_TYPES.DICE_ROLL)
    }

    // Get updated balance
    const economy = await getOrCreateUserEconomy(interaction.user.id, interaction.user.username)

    // Create result embed
    const embed = createDiceEmbed(
      interaction.user.username,
      numDice,
      rolls,
      sum,
      betType,
      prediction,
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
      content: "❌ An error occurred while rolling the dice!",
      ephemeral: true,
    })
  }
}

// Helper function to create dice result embed
function createDiceEmbed(
  username: string,
  numDice: number,
  rolls: number[],
  sum: number,
  betType: string | null,
  prediction: number | null,
  isWin: boolean,
  isBetting: boolean,
  betAmount: number,
  winnings: number,
  multiplier: number,
  newBalance: number,
): EmbedBuilder {
  const diceEmojis = ["", "⚀", "⚁", "⚂", "⚃", "⚄", "⚅"]
  const rollDisplay = rolls.map((roll) => diceEmojis[roll]).join(" ")

  const embed = new EmbedBuilder()
    .setTitle("🎲 Dice Roll")
    .setColor(isWin ? botInfo.colors.success : isBetting ? botInfo.colors.error : botInfo.colors.primary)
    .addFields(
      { name: "🎯 Dice", value: rollDisplay, inline: true },
      { name: "📊 Sum", value: sum.toString(), inline: true },
    )
    .setFooter({ text: `Rolled by ${username}` })
    .setTimestamp()

  if (numDice > 1) {
    embed.addFields({ name: "🔢 Individual Rolls", value: rolls.join(", "), inline: true })
  }

  if (isBetting && betType) {
    let betDescription = ""
    switch (betType) {
      case "exact":
        betDescription = `Exact ${numDice === 1 ? "number" : "sum"}: ${prediction}`
        break
      case "low":
        betDescription = numDice === 1 ? "Low (1-3)" : `Low (${numDice}-${Math.floor(numDice * 3.5)})`
        break
      case "high":
        betDescription = numDice === 1 ? "High (4-6)" : `High (${Math.floor(numDice * 3.5) + 1}-${numDice * 6})`
        break
      case "odd":
        betDescription = "Odd sum"
        break
      case "even":
        betDescription = "Even sum"
        break
    }

    embed.addFields({ name: "🎯 Your Bet", value: betDescription, inline: false })

    if (isWin) {
      embed.setDescription("🎉 **WINNER!** 🎉\nYour prediction was correct!")
      embed.addFields(
        { name: "💰 Bet Amount", value: `${betAmount.toLocaleString()} coins`, inline: true },
        { name: "🎊 Winnings", value: `${winnings.toLocaleString()} coins`, inline: true },
        { name: "📈 Profit", value: `${(winnings - betAmount).toLocaleString()} coins`, inline: true },
        { name: "⚡ Multiplier", value: `${multiplier}x`, inline: true },
      )
    } else {
      embed.setDescription("❌ **Better luck next time!**\nYour prediction was incorrect.")
      embed.addFields(
        { name: "💸 Lost", value: `${betAmount.toLocaleString()} coins`, inline: true },
        {
          name: "🎯 Potential Win",
          value: `${(betAmount * multiplier).toLocaleString()} coins (${multiplier}x)`,
          inline: true,
        },
      )
    }

    embed.addFields({ name: "💵 New Balance", value: `${newBalance.toLocaleString()} coins`, inline: true })
  } else {
    embed.setDescription(`You rolled ${rollDisplay}${numDice > 1 ? ` for a total of **${sum}**` : ""}!`)
    embed.addFields({
      name: "💡 Tip",
      value: "Add a bet type and amount to make it more exciting! Try exact predictions for huge multipliers!",
      inline: false,
    })
  }

  // Add odds information
  if (betType === "exact") {
    const winChance =
      numDice === 1
        ? "16.67%"
        : numDice === 2
          ? `${(100 / 36).toFixed(2)}% - ${((6 / 36) * 100).toFixed(2)}%`
          : `${(100 / 216).toFixed(2)}% - ${((27 / 216) * 100).toFixed(2)}%`
    embed.addFields({
      name: "📊 Game Info",
      value: `Dice: ${numDice} • Win Chance: ${winChance} • Max Multiplier: ${multiplier}x`,
      inline: false,
    })
  }

  return embed
}
