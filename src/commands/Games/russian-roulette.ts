import { SlashCommandBuilder, type ChatInputCommandInteraction, EmbedBuilder } from "discord.js"
import { botInfo } from "../../utils/bot-info"
import { config } from "../../utils/config"
import { placeBet, processWin, GAME_TYPES } from "../../utils/gambling-manager"
import { awardGamePlayedXp } from "../../utils/level-manager"

// Slash command definition
export const data = new SlashCommandBuilder()
  .setName("russian-roulette")
  .setDescription("Play Russian Roulette! High risk, high reward!")
  .addIntegerOption((option) =>
    option
      .setName("bet")
      .setDescription("Amount to bet (optional)")
      .setRequired(false)
      .setMinValue(1)
      .setMaxValue(50000),
  )

// Slash command execution
export async function execute(interaction: ChatInputCommandInteraction) {
  const betAmount = interaction.options.getInteger("bet") || 0

  // Determine if this is a gambling game or just for fun
  const isGambling = betAmount > 0

  if (isGambling) {
    // Handle betting logic
    const betResult = await placeBet(
      interaction.user.id,
      interaction.user.username,
      betAmount,
      GAME_TYPES.RUSSIAN_ROULETTE,
    )

    if (!betResult.success) {
      return interaction.reply({ content: `❌ ${betResult.message}`, ephemeral: true })
    }
  }

  // Russian Roulette logic - 1 in 6 chance of losing
  const chamber = Math.floor(Math.random() * 6) + 1
  const bulletChamber = 1 // The bullet is always in chamber 1 for simplicity
  const survived = chamber !== bulletChamber

  // Calculate winnings for gambling (high multiplier due to risk)
  let winnings = 0
  if (isGambling && survived) {
    winnings = betAmount * 5 // 5x multiplier for surviving
    await processWin(interaction.user.id, interaction.user.username, betAmount, winnings, GAME_TYPES.RUSSIAN_ROULETTE)
  }

  // Award XP for playing (bonus XP for surviving)
  await awardGamePlayedXp(interaction.user.id, interaction.user.username, survived)

  // Create result embed
  const embed = new EmbedBuilder()
    .setTitle("🔫 Russian Roulette")
    .setColor(survived ? botInfo.colors.success : botInfo.colors.error)
    .addFields(
      { name: "🎯 Chamber", value: `${chamber}/6`, inline: true },
      { name: "💀 Bullet Chamber", value: "🤫 Secret", inline: true },
      { name: "🏆 Result", value: survived ? "🎉 Survived!" : "💀 BANG!", inline: true },
    )
    .setFooter({ text: `${config.botName} • Requested by ${interaction.user.tag}` })
    .setTimestamp()

  if (isGambling) {
    embed.addFields(
      { name: "💰 Bet Amount", value: `${betAmount.toLocaleString()} coins`, inline: true },
      { name: "⚡ Multiplier", value: "5x", inline: true },
      { name: "💎 Winnings", value: survived ? `${winnings.toLocaleString()} coins` : "0 coins", inline: true },
    )
  }

  // Set description based on result
  if (survived) {
    embed.setDescription(
      isGambling
        ? `🎉 **You survived!** Nerves of steel earned you ${winnings.toLocaleString()} coins!`
        : "🎉 **You survived!** Lady Luck is on your side today!",
    )
  } else {
    embed.setDescription(
      isGambling
        ? `💀 **BANG!** The chamber wasn't empty. You lost ${betAmount.toLocaleString()} coins.`
        : "💀 **BANG!** The chamber wasn't empty. Better luck next time!",
    )
  }

  // Add chambers visualization
  const chambers = Array.from({ length: 6 }, (_, i) => {
    if (i + 1 === chamber) return survived ? "🔫" : "💥"
    return "⚪"
  }).join(" ")

  embed.addFields({ name: "🔫 Chambers", value: chambers, inline: false })

  await interaction.reply({ embeds: [embed] })
}
