import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js"
import { addFeedback } from "../../utils/feedback-manager"
import { config } from "../../utils/config"

// Slash command definition
export const data = new SlashCommandBuilder()
  .setName("feedback")
  .setDescription("Submit feedback about the bot")
  .addStringOption((option) =>
    option.setName("message").setDescription("Your feedback message").setRequired(true).setMaxLength(1000),
  )

// Slash command execution
export async function execute(interaction: ChatInputCommandInteraction) {
  const message = interaction.options.getString("message", true)

  // Validate feedback
  if (message.length < 10) {
    return interaction.reply({
      content: "❌ Feedback must be at least 10 characters long!",
      ephemeral: true,
    })
  }

  if (message.length > 1000) {
    return interaction.reply({
      content: "❌ Feedback must be less than 1000 characters!",
      ephemeral: true,
    })
  }

  // Clean the message
  const cleanMessage = message.trim().replace(/\s+/g, " ")

  try {
    await addFeedback(interaction.user.id, interaction.user.username, cleanMessage)

    await interaction.reply({
      content: `✅ Thank you for your feedback! It has been recorded and will be reviewed by the ${config.botName} developers.`,
      ephemeral: true,
    })
  } catch (error) {
    await interaction.reply({
      content: "❌ Failed to submit feedback. Please try again later.",
      ephemeral: true,
    })
  }
}
