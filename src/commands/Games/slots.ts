import { SlashCommandBuilder, type ChatInputCommandInteraction, EmbedBuilder } from "discord.js"
import { botInfo } from "../../utils/bot-info"
import { config } from "../../utils/config"
import { placeBet, processWin, GAME_TYPES } from "../../utils/gambling-manager"
import { awardGamePlayedXp } from "../../utils/level-manager"
import { checkRateLimit, RATE_LIMITS, getRemainingCooldown } from "../../utils/rate-limiter"

const SLOT_SYMBOLS = {
  "🍒": { name: "Cherry", weight: 30, value: 2 },
  "🍋": { name: "Lemon", weight: 25, value: 3 },
  "🍊": { name: "Orange", weight: 20, value: 4 },
  "🍇": { name: "Grape", weight: 15, value: 5 },
  "🔔": { name: "Bell", weight: 8, value: 10 },
  "💎": { name: "Diamond", weight: 2, value: 50 },
}

const JACKPOT_SYMBOL = "💰"
const JACKPOT_MULTIPLIER = 100

export const data = new SlashCommandBuilder()
  .setName("slots")
  .setDescription("Spin the slot machine and win big!")
  .addIntegerOption((option) =>
    option.setName("bet").setDescription("Amount to bet").setRequired(true).setMinValue(1).setMaxValue(100000),
  )
  .addIntegerOption((option) =>
    option.setName("spins").setDescription("Number of spins (1-10)").setRequired(false).setMinValue(1).setMaxValue(10),
  )

export async function execute(interaction: ChatInputCommandInteraction) {
  // Rate limiting
  if (!checkRateLimit(interaction.user.id, "slots", RATE_LIMITS.GAMBLING)) {
    const remaining = getRemainingCooldown(interaction.user.id, "slots", RATE_LIMITS.GAMBLING)
    return interaction.reply({
      content: `⏰ You're doing that too fast! Try again in ${Math.ceil(remaining / 1000)} seconds.`,
      ephemeral: true,
    })
  }

  const betAmount = interaction.options.getInteger("bet", true)
  const spins = interaction.options.getInteger("spins") || 1
  const totalBet = betAmount * spins

  const betResult = await placeBet(interaction.user.id, interaction.user.username, totalBet, GAME_TYPES.SLOTS)

  if (!betResult.success) {
    return interaction.reply({ content: `❌ ${betResult.message}`, ephemeral: true })
  }

  // Perform spins
  const results = []
  let totalWinnings = 0
  let biggestWin = 0

  for (let spin = 1; spin <= spins; spin++) {
    const symbols = [getRandomSymbol(), getRandomSymbol(), getRandomSymbol()]
    const { winnings, multiplier, winType } = calculateWinnings(symbols, betAmount)

    totalWinnings += winnings
    if (winnings > biggestWin) biggestWin = winnings

    results.push({
      spin,
      symbols,
      winnings,
      multiplier,
      winType,
    })
  }

  // Process winnings
  if (totalWinnings > 0) {
    await processWin(interaction.user.id, interaction.user.username, totalBet, totalWinnings, GAME_TYPES.SLOTS)
  }

  // Award XP
  await awardGamePlayedXp(interaction.user.id, interaction.user.username, totalWinnings > 0)

  // Create result embed
  const embed = new EmbedBuilder()
    .setTitle("🎰 Slot Machine Results")
    .setColor(totalWinnings > 0 ? botInfo.colors.success : botInfo.colors.error)
    .setFooter({ text: `${config.botName} • Requested by ${interaction.user.tag}` })
    .setTimestamp()

  // Add spin results
  const spinDetails = results
    .map((r) => {
      const symbolsDisplay = r.symbols.join(" ")
      const winDisplay = r.winnings > 0 ? ` → ${r.winnings.toLocaleString()} coins (${r.multiplier}x)` : ""
      return `Spin ${r.spin}: ${symbolsDisplay}${winDisplay}`
    })
    .join("\n")

  embed.addFields({ name: "🎰 Spin Results", value: spinDetails, inline: false })

  // Add summary
  const profit = totalWinnings - totalBet
  embed.addFields(
    { name: "💰 Total Bet", value: `${totalBet.toLocaleString()} coins`, inline: true },
    { name: "💎 Total Winnings", value: `${totalWinnings.toLocaleString()} coins`, inline: true },
    { name: "📊 Profit/Loss", value: `${profit >= 0 ? "+" : ""}${profit.toLocaleString()} coins`, inline: true },
  )

  if (biggestWin > 0) {
    embed.addFields({ name: "🏆 Biggest Win", value: `${biggestWin.toLocaleString()} coins`, inline: true })
  }

  // Set description based on results
  if (totalWinnings > 0) {
    const hasJackpot = results.some((r) => r.winType === "jackpot")
    if (hasJackpot) {
      embed.setDescription(`🎉 **JACKPOT!** You hit the jackpot and won ${totalWinnings.toLocaleString()} coins!`)
    } else {
      embed.setDescription(`🎉 **Winner!** You won ${totalWinnings.toLocaleString()} coins!`)
    }
  } else {
    embed.setDescription(
      `😔 **No wins this time!** You lost ${totalBet.toLocaleString()} coins. Better luck next spin!`,
    )
  }

  // Ensure results are always public (not ephemeral)
  await interaction.reply({ embeds: [embed], ephemeral: false })
}

function getRandomSymbol(): string {
  // 1% chance for jackpot symbol
  if (Math.random() < 0.01) {
    return JACKPOT_SYMBOL
  }

  const totalWeight = Object.values(SLOT_SYMBOLS).reduce((sum, symbol) => sum + symbol.weight, 0)
  let random = Math.random() * totalWeight

  for (const [symbol, data] of Object.entries(SLOT_SYMBOLS)) {
    random -= data.weight
    if (random <= 0) {
      return symbol
    }
  }

  return "🍒" // Fallback
}

function calculateWinnings(
  symbols: string[],
  betAmount: number,
): { winnings: number; multiplier: number; winType: string } {
  // Check for jackpot (three jackpot symbols)
  if (symbols.every((s) => s === JACKPOT_SYMBOL)) {
    return {
      winnings: betAmount * JACKPOT_MULTIPLIER,
      multiplier: JACKPOT_MULTIPLIER,
      winType: "jackpot",
    }
  }

  // Check for three of a kind
  if (symbols[0] === symbols[1] && symbols[1] === symbols[2]) {
    const symbol = symbols[0]
    if (SLOT_SYMBOLS[symbol as keyof typeof SLOT_SYMBOLS]) {
      const multiplier = SLOT_SYMBOLS[symbol as keyof typeof SLOT_SYMBOLS].value
      return {
        winnings: betAmount * multiplier,
        multiplier,
        winType: "three_of_a_kind",
      }
    }
  }

  // Check for two of a kind
  const symbolCounts = symbols.reduce(
    (counts, symbol) => {
      counts[symbol] = (counts[symbol] || 0) + 1
      return counts
    },
    {} as Record<string, number>,
  )

  for (const [symbol, count] of Object.entries(symbolCounts)) {
    if (count === 2 && SLOT_SYMBOLS[symbol as keyof typeof SLOT_SYMBOLS]) {
      const multiplier = Math.floor(SLOT_SYMBOLS[symbol as keyof typeof SLOT_SYMBOLS].value / 2)
      return {
        winnings: betAmount * multiplier,
        multiplier,
        winType: "two_of_a_kind",
      }
    }
  }

  return { winnings: 0, multiplier: 0, winType: "no_win" }
}
