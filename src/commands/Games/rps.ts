import { SlashCommandBuilder, type ChatInputCommandInteraction, EmbedBuilder } from "discord.js"
import { botInfo } from "../../utils/bot-info"
import { config } from "../../utils/config"
import { recordGame, getBotChoice, determineResult, type RPSChoice, type RPSResult } from "../../utils/rps-manager"

// Slash command definition
export const data = new SlashCommandBuilder()
  .setName("rps")
  .setDescription("Play Rock Paper Scissors!")
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

// Slash command execution
export async function execute(interaction: ChatInputCommandInteraction) {
  const playerChoice = interaction.options.getString("choice", true) as RPSChoice
  const botChoice = getBotChoice()
  const result = determineResult(playerChoice, botChoice)

  // Record the game result
  await recordGame(interaction.user.id, interaction.user.username, result)

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

  // Add result-specific description
  switch (result) {
    case "win":
      embed.setDescription("🎉 **You won!** Great choice!")
      break
    case "loss":
      embed.setDescription("😔 **You lost!** Better luck next time!")
      break
    case "tie":
      embed.setDescription("🤝 **It's a tie!** Great minds think alike!")
      break
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
