import { SlashCommandBuilder, type ChatInputCommandInteraction, EmbedBuilder } from "discord.js"
import { botInfo } from "../../utils/bot-info"
import { config } from "../../utils/config"
import { getOrCreateUserEconomy, removeCurrency, addCurrency, TRANSACTION_TYPES } from "../../utils/economy-manager"
import { updateGamblingStats } from "../../utils/gambling-manager"
import { awardGamePlayedXp } from "../../utils/level-manager"
import { checkRateLimit, RATE_LIMITS } from "../../utils/rate-limiter"

export const data = new SlashCommandBuilder()
  .setName("roulette")
  .setDescription("Play European roulette (0-36)")
  .addStringOption((option) =>
    option
      .setName("bet_type")
      .setDescription("Type of bet to place")
      .setRequired(true)
      .addChoices(
        { name: "Red", value: "red" },
        { name: "Black", value: "black" },
        { name: "Even", value: "even" },
        { name: "Odd", value: "odd" },
        { name: "High (19-36)", value: "high" },
        { name: "Low (1-18)", value: "low" },
        { name: "Specific Number (0-36)", value: "number" },
      ),
  )
  .addIntegerOption((option) =>
    option.setName("amount").setDescription("Amount to bet").setRequired(true).setMinValue(1),
  )
  .addIntegerOption((option) =>
    option
      .setName("number")
      .setDescription("Specific number to bet on (0-36, required for number bets)")
      .setRequired(false)
      .setMinValue(0)
      .setMaxValue(36),
  )
  .addIntegerOption((option) =>
    option
      .setName("spins")
      .setDescription("Number of spins to play (1-10)")
      .setRequired(false)
      .setMinValue(1)
      .setMaxValue(10),
  )

export async function execute(interaction: ChatInputCommandInteraction) {
  const userId = interaction.user.id
  const username = interaction.user.username

  // Check rate limit
  if (!checkRateLimit(userId, "roulette", RATE_LIMITS.GAMBLING)) {
    return interaction.reply({
      content: "⏰ Please wait before gambling again. (2 second cooldown)",
      ephemeral: true,
    })
  }

  try {
    const betType = interaction.options.getString("bet_type", true)
    const amount = interaction.options.getInteger("amount", true)
    const specificNumber = interaction.options.getInteger("number")
    const spins = interaction.options.getInteger("spins") || 1

    // Validate specific number bet
    if (betType === "number" && specificNumber === null) {
      return interaction.reply({
        content: "❌ You must specify a number (0-36) when betting on a specific number.",
        ephemeral: true,
      })
    }

    const totalBet = amount * spins

    // Check if user has enough funds
    const user = await getOrCreateUserEconomy(userId, username)
    if (user.balance < totalBet) {
      return interaction.reply({
        content: `❌ Insufficient funds! You need ${totalBet.toLocaleString()} coins but only have ${user.balance.toLocaleString()} coins.\n💡 **Tip:** Use \`/work\` to earn more coins!`,
        ephemeral: true,
      })
    }

    // Remove bet amount
    const removeResult = await removeCurrency(
      userId,
      username,
      totalBet,
      TRANSACTION_TYPES.GAMBLING_BET,
      `Roulette bet (${spins} spins)`,
    )

    if (!removeResult.success) {
      return interaction.reply({
        content: `❌ ${removeResult.message}`,
        ephemeral: true,
      })
    }

    // Play the game
    const results = []
    let totalWinnings = 0

    for (let i = 0; i < spins; i++) {
      const spinResult = Math.floor(Math.random() * 37) // 0-36
      const isWin = checkWin(betType, spinResult, specificNumber)
      const multiplier = getMultiplier(betType)
      const winAmount = isWin ? amount * multiplier : 0

      results.push({
        spin: i + 1,
        number: spinResult,
        color: getColor(spinResult),
        isWin,
        winAmount,
      })

      totalWinnings += winAmount
    }

    // Add winnings if any
    if (totalWinnings > 0) {
      await addCurrency(userId, username, totalWinnings, TRANSACTION_TYPES.GAMBLING_WIN, "Roulette winnings")
    }

    // Update gambling stats
    const netResult = totalWinnings - totalBet
    await updateGamblingStats(userId, totalBet, totalWinnings, netResult)

    // Award XP
    await awardGamePlayedXp(userId, username, totalWinnings > 0)

    // Create result embed
    const embed = new EmbedBuilder()
      .setTitle("🎰 Roulette Results")
      .setColor(netResult > 0 ? botInfo.colors.success : botInfo.colors.error)

    // Add spin results
    const spinResults = results
      .map((result) => {
        const emoji = result.isWin ? "✅" : "❌"
        const colorEmoji = result.color === "red" ? "🔴" : result.color === "black" ? "⚫" : "🟢"
        return `${emoji} **Spin ${result.spin}:** ${colorEmoji} ${result.number} ${
          result.isWin ? `(+${result.winAmount.toLocaleString()})` : ""
        }`
      })
      .join("\n")

    embed.setDescription(spinResults)

    // Add bet details
    let betDescription = `**Bet:** ${betType.charAt(0).toUpperCase() + betType.slice(1)}`
    if (betType === "number") {
      betDescription += ` (${specificNumber})`
    }

    embed.addFields(
      { name: "🎯 Bet Details", value: betDescription, inline: true },
      { name: "💰 Total Bet", value: `${totalBet.toLocaleString()} coins`, inline: true },
      { name: "🏆 Total Winnings", value: `${totalWinnings.toLocaleString()} coins`, inline: true },
      {
        name: netResult > 0 ? "📈 Net Profit" : "📉 Net Loss",
        value: `${Math.abs(netResult).toLocaleString()} coins`,
        inline: true,
      },
    )

    const updatedUser = await getOrCreateUserEconomy(userId, username)
    embed.addFields({ name: "💳 New Balance", value: `${updatedUser.balance.toLocaleString()} coins`, inline: true })

    embed.setFooter({ text: `${config.botName} • European Roulette` })
    embed.setTimestamp()

    await interaction.reply({ embeds: [embed] })
  } catch (error) {
    await interaction.reply({
      content: "❌ An error occurred while playing roulette.",
      ephemeral: true,
    })
  }
}

function checkWin(betType: string, number: number, specificNumber?: number | null): boolean {
  switch (betType) {
    case "red":
      return isRed(number)
    case "black":
      return isBlack(number)
    case "even":
      return number !== 0 && number % 2 === 0
    case "odd":
      return number !== 0 && number % 2 === 1
    case "high":
      return number >= 19 && number <= 36
    case "low":
      return number >= 1 && number <= 18
    case "number":
      return number === specificNumber
    default:
      return false
  }
}

function getMultiplier(betType: string): number {
  switch (betType) {
    case "red":
    case "black":
    case "even":
    case "odd":
    case "high":
    case "low":
      return 2
    case "number":
      return 36
    default:
      return 1
  }
}

function isRed(number: number): boolean {
  const redNumbers = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]
  return redNumbers.includes(number)
}

function isBlack(number: number): boolean {
  return number !== 0 && !isRed(number)
}

function getColor(number: number): string {
  if (number === 0) return "green"
  return isRed(number) ? "red" : "black"
}
