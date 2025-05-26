import { SlashCommandBuilder, type ChatInputCommandInteraction, EmbedBuilder } from "discord.js"
import { botInfo } from "../../utils/bot-info"
import { config } from "../../utils/config"
import { getBotChoice, determineResult, type RPSChoice, type RPSResult } from "../../utils/rps-manager"
import { placeBet, processWin, GAME_TYPES } from "../../utils/gambling-manager"
import { awardGamePlayedXp } from "../../utils/level-manager"

// Slash command definition
export const data = new SlashCommandBuilder()
  .setName("rps")
  .setDescription("Play Rock Paper Scissors with optional betting!")
  .addStringOption((option) =>
    option
      .setName("choice")
      .setDescription("Your choice")
      .setRequired(true)
      .addChoices(
        { name: "🪨 Rock", value: "rock" },
        { name: "📄 Paper", value: "paper" },
        { name: "✂️ Scissors", value: "scissors" },
      ),
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
  const playerChoice = interaction.options.getString("choice", true) as RPSChoice
  const betAmount = interaction.options.getInteger("bet") || 0
  const isGambling = betAmount > 0

  if (isGambling) {
    // Handle betting logic
    const betResult = await placeBet(interaction.user.id, interaction.user.username, betAmount, GAME_TYPES.RPS)

    if (!betResult.success) {
      return interaction.reply({ content: `❌ ${betResult.message}`, ephemeral: true })
    }
  }

  const botChoice = getBotChoice()
  const result = determineResult(playerChoice, botChoice)

  // Calculate winnings for gambling
  let winnings = 0
  if (isGambling && result === "win") {
    winnings = betAmount * 2 // 2x multiplier for RPS wins
    await processWin(interaction.user.id, interaction.user.username, betAmount, winnings, GAME_TYPES.RPS)
  }

  // Award XP for playing the game
  await awardGamePlayedXp(interaction.user.id, interaction.user.username, result === "win")

  // Create result embed
  const embed = new EmbedBuilder()
    .setTitle("🎮 Rock Paper Scissors")
    .setColor(getResultColor(result))
    .addFields(
      { name: "Your Choice", value: getChoiceEmoji(playerChoice), inline: true },
      { name: `${config.botName}'s Choice`, value: getChoiceEmoji(botChoice), inline: true },
      { name: "Result", value: getResultText(result), inline: true },
    )
    .setFooter({ text: `${config.botName} • Requested by ${interaction.user.tag}` })
    .setTimestamp()

  // Add result-specific description and gambling info
  let description = ""
  switch (result) {
    case "win":
      description = isGambling
        ? `🎉 **You won!** You earned ${winnings.toLocaleString()} coins!`
        : "🎉 **You won!** Great choice!"
      break
    case "loss":
      description = isGambling
        ? `😔 **You lost!** You lost ${betAmount.toLocaleString()} coins.`
        : "😔 **You lost!** Better luck next time!"
      break
    case "tie":
      description = isGambling
        ? `🤝 **It's a tie!** Your bet of ${betAmount.toLocaleString()} coins has been refunded.`
        : "🤝 **It's a tie!** Great minds think alike!"
      break
  }

  embed.setDescription(description)

  // Add gambling-specific fields
  if (isGambling) {
    embed.addFields(
      { name: "💰 Bet Amount", value: `${betAmount.toLocaleString()} coins`, inline: true },
      { name: "⚡ Multiplier", value: "2x (win)", inline: true },
      {
        name: "💎 Outcome",
        value:
          result === "win"
            ? `+${(winnings - betAmount).toLocaleString()} coins`
            : result === "tie"
              ? "Refunded"
              : `-${betAmount.toLocaleString()} coins`,
        inline: true,
      },
    )

    // Handle tie refund
    if (result === "tie") {
      // Refund the bet for ties
      const { addCurrency, TRANSACTION_TYPES } = await import("../../utils/economy-manager")
      await addCurrency(
        interaction.user.id,
        interaction.user.username,
        betAmount,
        TRANSACTION_TYPES.GAMBLING_WIN,
        "RPS tie refund",
      )
    }
  }

  await interaction.reply({ embeds: [embed] })
}

// Helper functions
function getChoiceEmoji(choice: RPSChoice): string {
  switch (choice) {
    case "rock":
      return "🪨 Rock"
    case "paper":
      return "📄 Paper"
    case "scissors":
      return "✂️ Scissors"
  }
}

function getResultText(result: RPSResult): string {
  switch (result) {
    case "win":
      return "🏆 Victory!"
    case "loss":
      return "💀 Defeat"
    case "tie":
      return "🤝 Tie"
  }
}

function getResultColor(result: RPSResult): number {
  switch (result) {
    case "win":
      return botInfo.colors.success
    case "loss":
      return botInfo.colors.error
    case "tie":
      return botInfo.colors.warning
  }
}
