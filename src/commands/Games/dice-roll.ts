import { SlashCommandBuilder, type ChatInputCommandInteraction, EmbedBuilder } from "discord.js"
import { botInfo } from "../../utils/bot-info"
import { placeBet, processWin, GAME_TYPES } from "../../utils/gambling-manager"
import { getOrCreateUserEconomy } from "../../utils/economy-manager"

// Multiplier configurations
const MULTIPLIERS = {
  single_exact: 6,
  two_exact: { 2: 36, 3: 18, 4: 12, 5: 9, 6: 7.2, 7: 6, 8: 7.2, 9: 9, 10: 12, 11: 18, 12: 36 } as Record<
    number,
    number
  >,
  three_exact: {
    3: 216,
    4: 108,
    5: 72,
    6: 54,
    7: 43.2,
    8: 36,
    9: 32.4,
    10: 30,
    11: 30,
    12: 32.4,
    13: 36,
    14: 43.2,
    15: 54,
    16: 72,
    17: 108,
    18: 216,
  } as Record<number, number>,
  range: 2,
}

export const data = new SlashCommandBuilder()
  .setName("dice-roll")
  .setDescription("Roll dice and predict the outcome - with optional betting!")
  .addIntegerOption((option) =>
    option
      .setName("dice")
      .setDescription("Number of dice to roll (1-3)")
      .setRequired(true)
      .setMinValue(1)
      .setMaxValue(3),
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
    option.setName("prediction").setDescription("Your exact number/sum prediction").setRequired(false),
  )
  .addIntegerOption((option) =>
    option.setName("bet").setDescription("Amount to bet").setRequired(false).setMinValue(1).setMaxValue(1000000),
  )

export async function execute(interaction: ChatInputCommandInteraction) {
  const numDice = interaction.options.getInteger("dice", true)
  const betType = interaction.options.getString("bet-type")
  const prediction = interaction.options.getInteger("prediction")
  const betAmount = interaction.options.getInteger("bet")

  // Validate parameters
  if (betAmount && !betType) {
    return interaction.reply({ content: "❌ You must choose a bet type when placing a bet!", ephemeral: true })
  }

  if (betType === "exact" && !prediction) {
    return interaction.reply({ content: "❌ You must provide a prediction for exact bets!", ephemeral: true })
  }

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
    // Handle betting
    let isBetting = false
    if (betAmount && betType) {
      const betResult = await placeBet(interaction.user.id, interaction.user.username, betAmount, GAME_TYPES.DICE_ROLL)
      if (!betResult.success) {
        return interaction.reply({ content: `❌ ${betResult.message}`, ephemeral: true })
      }
      isBetting = true
    }

    // Roll the dice
    const rolls = Array.from({ length: numDice }, () => Math.floor(Math.random() * 6) + 1)
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
            multiplier = MULTIPLIERS.two_exact[sum] || 6
          } else {
            isWin = prediction === sum
            multiplier = MULTIPLIERS.three_exact[sum] || 30
          }
          break
        case "low":
          isWin = numDice === 1 ? rolls[0] <= 3 : sum <= numDice * 3.5
          multiplier = MULTIPLIERS.range
          break
        case "high":
          isWin = numDice === 1 ? rolls[0] >= 4 : sum > numDice * 3.5
          multiplier = MULTIPLIERS.range
          break
        case "odd":
          isWin = sum % 2 === 1
          multiplier = MULTIPLIERS.range
          break
        case "even":
          isWin = sum % 2 === 0
          multiplier = MULTIPLIERS.range
          break
      }
    }

    // Calculate winnings
    const winnings = isBetting && betAmount && isWin ? Math.floor(betAmount * multiplier) : 0

    // Process winnings if betting and won
    if (isBetting && betAmount && isWin) {
      await processWin(interaction.user.id, interaction.user.username, betAmount, winnings, GAME_TYPES.DICE_ROLL)
    }

    // Get updated balance
    const economy = await getOrCreateUserEconomy(interaction.user.id, interaction.user.username)

    // Create result embed
    const diceEmojis = ["", "⚀", "⚁", "⚂", "⚃", "⚄", "⚅"]
    const rollDisplay = rolls.map((roll) => diceEmojis[roll]).join(" ")

    const embed = new EmbedBuilder()
      .setTitle("🎲 Dice Roll")
      .setColor(isWin ? botInfo.colors.success : isBetting ? botInfo.colors.error : botInfo.colors.primary)
      .addFields(
        { name: "🎯 Dice", value: rollDisplay, inline: true },
        { name: "📊 Sum", value: sum.toString(), inline: true },
      )
      .setFooter({ text: `Rolled by ${interaction.user.username}` })
      .setTimestamp()

    if (numDice > 1) {
      embed.addFields({ name: "🔢 Individual Rolls", value: rolls.join(", "), inline: true })
    }

    if (isBetting && betType) {
      // Add bet info
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
          { name: "💰 Bet", value: `${betAmount!.toLocaleString()} coins`, inline: true },
          { name: "🎊 Winnings", value: `${winnings.toLocaleString()} coins`, inline: true },
          { name: "💵 Balance", value: `${economy.balance.toLocaleString()} coins`, inline: true },
        )
      } else {
        embed.setDescription("❌ **Better luck next time!**")
        embed.addFields(
          { name: "💸 Lost", value: `${betAmount!.toLocaleString()} coins`, inline: true },
          { name: "💵 Balance", value: `${economy.balance.toLocaleString()} coins`, inline: true },
        )
      }
    } else {
      embed.setDescription(`You rolled ${rollDisplay}${numDice > 1 ? ` for a total of **${sum}**` : ""}!`)
      embed.addFields({
        name: "💡 Tip",
        value: "Add a bet type and amount to make it more exciting!",
        inline: false,
      })
    }

    await interaction.reply({ embeds: [embed] })
  } catch (error) {
    await interaction.reply({ content: "❌ An error occurred while rolling the dice!", ephemeral: true })
  }
}