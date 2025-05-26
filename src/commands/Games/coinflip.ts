import { SlashCommandBuilder, type ChatInputCommandInteraction, EmbedBuilder } from "discord.js"
import { botInfo } from "../../utils/bot-info"
import { config } from "../../utils/config"
import { placeBet, processWin, GAME_TYPES } from "../../utils/gambling-manager"
import { awardGamePlayedXp } from "../../utils/level-manager"
import { checkRateLimit, RATE_LIMITS, getRemainingCooldown } from "../../utils/rate-limiter"

// Slash command definition
export const data = new SlashCommandBuilder()
  .setName("coinflip")
  .setDescription("Flip a coin and bet on the outcome!")
  .addStringOption((option) =>
    option
      .setName("choice")
      .setDescription("Choose heads or tails")
      .setRequired(true)
      .addChoices({ name: "🪙 Heads", value: "heads" }, { name: "🪙 Tails", value: "tails" }),
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
    option.setName("flips").setDescription("Number of flips (1-10)").setRequired(false).setMinValue(1).setMaxValue(10),
  )

// Slash command execution
export async function execute(interaction: ChatInputCommandInteraction) {
  // Rate limiting
  if (!checkRateLimit(interaction.user.id, "coinflip", RATE_LIMITS.GAMBLING)) {
    const remaining = getRemainingCooldown(interaction.user.id, "coinflip", RATE_LIMITS.GAMBLING)
    return interaction.reply({
      content: `⏰ You're doing that too fast! Try again in ${Math.ceil(remaining / 1000)} seconds.`,
      ephemeral: true,
    })
  }

  const playerChoice = interaction.options.getString("choice", true)
  const betAmount = interaction.options.getInteger("bet") || 0
  const flips = interaction.options.getInteger("flips") || 1
  const isGambling = betAmount > 0

  if (isGambling) {
    const totalBet = betAmount * flips
    const betResult = await placeBet(interaction.user.id, interaction.user.username, totalBet, GAME_TYPES.COINFLIP)

    if (!betResult.success) {
      return interaction.reply({ content: `❌ ${betResult.message}`, ephemeral: true })
    }
  }

  // Perform flips
  const results = []
  let wins = 0
  let totalWinnings = 0

  for (let flip = 1; flip <= flips; flip++) {
    const coinResult = Math.random() < 0.5 ? "heads" : "tails"
    const won = playerChoice === coinResult

    if (won) {
      wins++
      if (isGambling) {
        const roundWinnings = betAmount * 2
        totalWinnings += roundWinnings
      }
    }

    results.push({
      flip,
      result: coinResult,
      won,
    })
  }

  // Process winnings
  if (isGambling && totalWinnings > 0) {
    await processWin(
      interaction.user.id,
      interaction.user.username,
      betAmount * flips,
      totalWinnings,
      GAME_TYPES.COINFLIP,
    )
  }

  // Award XP
  await awardGamePlayedXp(interaction.user.id, interaction.user.username, wins > 0)

  // Create result embed
  const embed = new EmbedBuilder()
    .setTitle("🪙 Coinflip Results")
    .setColor(wins > 0 ? botInfo.colors.success : botInfo.colors.error)
    .addFields(
      {
        name: "Your Choice",
        value: `🪙 ${playerChoice.charAt(0).toUpperCase() + playerChoice.slice(1)}`,
        inline: true,
      },
      { name: "🏆 Wins", value: `${wins}/${flips}`, inline: true },
      { name: "📊 Win Rate", value: `${Math.round((wins / flips) * 100)}%`, inline: true },
    )
    .setFooter({ text: `${config.botName} • Requested by ${interaction.user.tag}` })
    .setTimestamp()

  // Add flip results
  const flipDetails = results
    .map((r) => `Flip ${r.flip}: ${r.result.charAt(0).toUpperCase() + r.result.slice(1)} ${r.won ? "✅" : "❌"}`)
    .join("\n")

  embed.addFields({ name: "🪙 Flip Results", value: flipDetails, inline: false })

  if (isGambling) {
    const totalBet = betAmount * flips
    const profit = totalWinnings - totalBet

    embed.addFields(
      { name: "💰 Total Bet", value: `${totalBet.toLocaleString()} coins`, inline: true },
      { name: "💎 Total Winnings", value: `${totalWinnings.toLocaleString()} coins`, inline: true },
      { name: "📊 Profit/Loss", value: `${profit >= 0 ? "+" : ""}${profit.toLocaleString()} coins`, inline: true },
    )
  }

  if (wins > 0) {
    embed.setDescription(
      isGambling
        ? `🎉 **${wins} correct prediction${wins === 1 ? "" : "s"}!** You won ${totalWinnings.toLocaleString()} coins!`
        : `🎉 **${wins} correct prediction${wins === 1 ? "" : "s"}!** Great guessing!`,
    )
  } else {
    embed.setDescription(
      isGambling
        ? `😔 **No correct predictions!** You lost ${(betAmount * flips).toLocaleString()} coins.`
        : "😔 **No correct predictions!** Better luck next time!",
    )
  }

  await interaction.reply({ embeds: [embed] })
}
