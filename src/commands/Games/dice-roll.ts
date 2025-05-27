import { SlashCommandBuilder, type ChatInputCommandInteraction, EmbedBuilder } from "discord.js"
import { botInfo } from "../../utils/bot-info"
import { config } from "../../utils/config"
import { placeBet, processWin, GAME_TYPES } from "../../utils/gambling-manager"
import { awardGamePlayedXp } from "../../utils/level-manager"

// Slash command definition
export const data = new SlashCommandBuilder()
  .setName("dice-roll")
  .setDescription("Roll dice and bet on the outcome!")
  .addIntegerOption((option) =>
    option
      .setName("prediction")
      .setDescription("Predict the sum of two dice (2-12)")
      .setRequired(true)
      .setMinValue(2)
      .setMaxValue(12),
  )
  .addIntegerOption((option) =>
    option
      .setName("bet")
      .setDescription("Amount to bet (optional)")
      .setRequired(false)
      .setMinValue(1)
      .setMaxValue(100000),
  )

// Slash command execution
export async function execute(interaction: ChatInputCommandInteraction) {
  const prediction = interaction.options.getInteger("prediction", true)
  const betAmount = interaction.options.getInteger("bet") || 0

  // Determine if this is a gambling game or just for fun
  const isGambling = betAmount > 0

  if (isGambling) {
    // Handle betting logic
    const betResult = await placeBet(interaction.user.id, interaction.user.username, betAmount, GAME_TYPES.DICE_ROLL)

    if (!betResult.success) {
      return interaction.reply({ content: `❌ ${betResult.message}`, ephemeral: true })
    }
  }

  // Roll the dice
  const die1 = Math.floor(Math.random() * 6) + 1
  const die2 = Math.floor(Math.random() * 6) + 1
  const total = die1 + die2
  const won = prediction === total

  // Calculate winnings for gambling (higher multiplier for exact prediction)
  let winnings = 0
  if (isGambling && won) {
    // Different multipliers based on probability
    const multiplier = getPredictionMultiplier(prediction)
    winnings = Math.floor(betAmount * multiplier)
    await processWin(interaction.user.id, interaction.user.username, betAmount, winnings, GAME_TYPES.DICE_ROLL)
  }

  // Award XP for playing
  await awardGamePlayedXp(interaction.user.id, interaction.user.username, won)

  // Create result embed
  const embed = new EmbedBuilder()
    .setTitle("🎲 Dice Roll")
    .setColor(won ? botInfo.colors.success : botInfo.colors.error)
    .addFields(
      { name: "🎯 Your Prediction", value: prediction.toString(), inline: true },
      { name: "🎲 Dice Result", value: `${getDieEmoji(die1)} ${getDieEmoji(die2)}`, inline: true },
      { name: "📊 Total", value: total.toString(), inline: true },
      { name: "🏆 Result", value: won ? "🎉 Correct!" : "❌ Wrong!", inline: true },
    )
    .setFooter({ text: `${config.botName} • Requested by ${interaction.user.tag}` })
    .setTimestamp()

  if (isGambling) {
    const multiplier = getPredictionMultiplier(prediction)
    embed.addFields(
      { name: "💰 Bet Amount", value: `${betAmount.toLocaleString()} coins`, inline: true },
      { name: "⚡ Multiplier", value: `${multiplier}x`, inline: true },
      { name: "💎 Winnings", value: won ? `${winnings.toLocaleString()} coins` : "0 coins", inline: true },
    )
  }

  // Set description based on result
  if (won) {
    embed.setDescription(
      isGambling
        ? `🎉 **Perfect prediction!** You won ${winnings.toLocaleString()} coins!`
        : "🎉 **Amazing!** You predicted it perfectly!",
    )
  } else {
    embed.setDescription(
      isGambling
        ? `😔 **Close, but not quite!** You lost ${betAmount.toLocaleString()} coins.`
        : `😔 **So close!** You predicted ${prediction} but got ${total}.`,
    )
  }

  // Ensure results are always public (not ephemeral)
  await interaction.reply({ embeds: [embed], ephemeral: false })
}

// Helper functions
function getDieEmoji(value: number): string {
  const diceEmojis = ["", "⚀", "⚁", "⚂", "⚃", "⚄", "⚅"]
  return diceEmojis[value] || "🎲"
}

function getPredictionMultiplier(prediction: number): number {
  // More difficult predictions have higher multipliers
  switch (prediction) {
    case 2:
    case 12:
      return 35 // 1/36 chance
    case 3:
    case 11:
      return 17 // 2/36 chance
    case 4:
    case 10:
      return 11 // 3/36 chance
    case 5:
    case 9:
      return 8 // 4/36 chance
    case 6:
    case 8:
      return 6 // 5/36 chance
    case 7:
      return 5 // 6/36 chance (most common)
    default:
      return 2
  }
}
