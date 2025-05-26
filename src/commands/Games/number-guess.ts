import { SlashCommandBuilder, type ChatInputCommandInteraction, EmbedBuilder } from "discord.js"
import { botInfo } from "../../utils/bot-info"
import { config } from "../../utils/config"
import { placeBet, processWin, GAME_TYPES } from "../../utils/gambling-manager"
import { awardGamePlayedXp } from "../../utils/level-manager"
import { checkRateLimit, RATE_LIMITS, getRemainingCooldown } from "../../utils/rate-limiter"

// Slash command definition
export const data = new SlashCommandBuilder()
  .setName("number-guess")
  .setDescription("Guess a number within a range!")
  .addIntegerOption((option) =>
    option.setName("guess").setDescription("Your number guess").setRequired(true).setMinValue(1),
  )
  .addIntegerOption((option) =>
    option
      .setName("range")
      .setDescription("Maximum number in range (1 to this number)")
      .setRequired(false)
      .setMinValue(2)
      .setMaxValue(100),
  )
  .addIntegerOption((option) =>
    option
      .setName("bet")
      .setDescription("Amount to bet (optional)")
      .setRequired(false)
      .setMinValue(1)
      .setMaxValue(100000),
  )
  .addIntegerOption((option) =>
    option
      .setName("rounds")
      .setDescription("Number of rounds to play (1-10)")
      .setRequired(false)
      .setMinValue(1)
      .setMaxValue(10),
  )

// Slash command execution
export async function execute(interaction: ChatInputCommandInteraction) {
  // Rate limiting
  if (!checkRateLimit(interaction.user.id, "number-guess", RATE_LIMITS.GAMBLING)) {
    const remaining = getRemainingCooldown(interaction.user.id, "number-guess", RATE_LIMITS.GAMBLING)
    return interaction.reply({
      content: `⏰ You're doing that too fast! Try again in ${Math.ceil(remaining / 1000)} seconds.`,
      ephemeral: true,
    })
  }

  const guess = interaction.options.getInteger("guess", true)
  const range = interaction.options.getInteger("range") || 10
  const betAmount = interaction.options.getInteger("bet") || 0
  const rounds = interaction.options.getInteger("rounds") || 1
  const isGambling = betAmount > 0

  // Validate guess is within range
  if (guess > range) {
    return interaction.reply({
      content: `❌ Your guess (${guess}) must be within the range of 1-${range}!`,
      ephemeral: true,
    })
  }

  if (isGambling) {
    const totalBet = betAmount * rounds
    const betResult = await placeBet(interaction.user.id, interaction.user.username, totalBet, GAME_TYPES.NUMBER_GUESS)

    if (!betResult.success) {
      return interaction.reply({ content: `❌ ${betResult.message}`, ephemeral: true })
    }
  }

  // Play multiple rounds
  const results = []
  let totalWinnings = 0
  let wins = 0

  for (let round = 1; round <= rounds; round++) {
    const randomNumber = Math.floor(Math.random() * range) + 1
    const won = guess === randomNumber

    if (won) {
      wins++
      if (isGambling) {
        const multiplier = calculateMultiplier(range)
        const roundWinnings = Math.floor(betAmount * multiplier)
        totalWinnings += roundWinnings
      }
    }

    results.push({
      round,
      randomNumber,
      won,
    })
  }

  // Process winnings
  if (isGambling && totalWinnings > 0) {
    await processWin(
      interaction.user.id,
      interaction.user.username,
      betAmount * rounds,
      totalWinnings,
      GAME_TYPES.NUMBER_GUESS,
    )
  }

  // Award XP
  await awardGamePlayedXp(interaction.user.id, interaction.user.username, wins > 0)

  // Create result embed
  const embed = new EmbedBuilder()
    .setTitle("🔢 Number Guessing Results")
    .setColor(wins > 0 ? botInfo.colors.success : botInfo.colors.error)
    .addFields(
      { name: "🎯 Your Guess", value: guess.toString(), inline: true },
      { name: "📊 Range", value: `1-${range}`, inline: true },
      { name: "🏆 Wins", value: `${wins}/${rounds}`, inline: true },
    )
    .setFooter({ text: `${config.botName} • Requested by ${interaction.user.tag}` })
    .setTimestamp()

  // Add round details
  const roundDetails = results.map((r) => `Round ${r.round}: ${r.randomNumber} ${r.won ? "✅" : "❌"}`).join("\n")

  embed.addFields({ name: "🎮 Round Results", value: roundDetails, inline: false })

  if (isGambling) {
    const multiplier = calculateMultiplier(range)
    const totalBet = betAmount * rounds
    const profit = totalWinnings - totalBet

    embed.addFields(
      { name: "💰 Total Bet", value: `${totalBet.toLocaleString()} coins`, inline: true },
      { name: "⚡ Multiplier", value: `${multiplier}x`, inline: true },
      { name: "💎 Total Winnings", value: `${totalWinnings.toLocaleString()} coins`, inline: true },
      { name: "📊 Profit/Loss", value: `${profit >= 0 ? "+" : ""}${profit.toLocaleString()} coins`, inline: true },
    )
  }

  if (wins > 0) {
    embed.setDescription(
      isGambling
        ? `🎉 **${wins} correct guess${wins === 1 ? "" : "es"}!** You won ${totalWinnings.toLocaleString()} coins!`
        : `🎉 **${wins} correct guess${wins === 1 ? "" : "es"}!** Well done!`,
    )
  } else {
    embed.setDescription(
      isGambling
        ? `😔 **No correct guesses!** You lost ${(betAmount * rounds).toLocaleString()} coins.`
        : `😔 **No correct guesses!** The numbers were: ${results.map((r) => r.randomNumber).join(", ")}`,
    )
  }

  await interaction.reply({ embeds: [embed] })
}

function calculateMultiplier(range: number): number {
  // Higher range = higher multiplier due to lower probability
  if (range <= 5) return 3
  if (range <= 10) return 5
  if (range <= 20) return 10
  if (range <= 50) return 25
  return 50
}
