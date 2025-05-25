import { SlashCommandBuilder, type ChatInputCommandInteraction, EmbedBuilder } from "discord.js"
import { botInfo } from "../../utils/bot-info"
import { config } from "../../utils/config"
import { placeBet, processWin, GAME_TYPES } from "../../utils/gambling-manager"
import { awardGamePlayedXp } from "../../utils/level-manager"

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

// Slash command execution
export async function execute(interaction: ChatInputCommandInteraction) {
  const playerChoice = interaction.options.getString("choice", true)
  const betAmount = interaction.options.getInteger("bet") || 0

  // Determine if this is a gambling game or just for fun
  const isGambling = betAmount > 0

  if (isGambling) {
    // Handle betting logic
    const betResult = await placeBet(interaction.user.id, interaction.user.username, betAmount, GAME_TYPES.COINFLIP)

    if (!betResult.success) {
      return interaction.reply({ content: `❌ ${betResult.message}`, ephemeral: true })
    }
  }

  // Flip the coin
  const coinResult = Math.random() < 0.5 ? "heads" : "tails"
  const won = playerChoice === coinResult

  // Calculate winnings for gambling
  let winnings = 0
  if (isGambling && won) {
    winnings = betAmount * 2 // 2x multiplier for coinflip
    await processWin(interaction.user.id, interaction.user.username, betAmount, winnings, GAME_TYPES.COINFLIP)
  }

  // Award XP for playing
  await awardGamePlayedXp(interaction.user.id, interaction.user.username, won)

  // Create result embed
  const embed = new EmbedBuilder()
    .setTitle("🪙 Coinflip")
    .setColor(won ? botInfo.colors.success : botInfo.colors.error)
    .addFields(
      {
        name: "Your Choice",
        value: `🪙 ${playerChoice.charAt(0).toUpperCase() + playerChoice.slice(1)}`,
        inline: true,
      },
      { name: "Coin Result", value: `🪙 ${coinResult.charAt(0).toUpperCase() + coinResult.slice(1)}`, inline: true },
      { name: "Result", value: won ? "🏆 You Won!" : "💀 You Lost!", inline: true },
    )
    .setFooter({ text: `${config.botName} • Requested by ${interaction.user.tag}` })
    .setTimestamp()

  if (isGambling) {
    embed.addFields(
      { name: "💰 Bet Amount", value: `${betAmount.toLocaleString()} coins`, inline: true },
      { name: "💎 Winnings", value: won ? `${winnings.toLocaleString()} coins` : "0 coins", inline: true },
      {
        name: "📊 Net Result",
        value: won ? `+${(winnings - betAmount).toLocaleString()} coins` : `-${betAmount.toLocaleString()} coins`,
        inline: true,
      },
    )
  }

  // Set description based on result
  if (won) {
    embed.setDescription(
      isGambling
        ? `🎉 **Congratulations!** You won ${winnings.toLocaleString()} coins!`
        : "🎉 **Lucky guess!** You called it right!",
    )
  } else {
    embed.setDescription(
      isGambling
        ? `😔 **Better luck next time!** You lost ${betAmount.toLocaleString()} coins.`
        : "😔 **Better luck next time!** The coin had other plans.",
    )
  }

  await interaction.reply({ embeds: [embed] })
}
