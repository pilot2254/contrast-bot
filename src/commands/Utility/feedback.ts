import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js"
import { addFeedback } from "../../utils/feedback-manager"

// Slash command definition
export const data = new SlashCommandBuilder()
  .setName("feedback")
  .setDescription("Submit feedback about the bot")
  .addStringOption((option) =>
    option.setName("message").setDescription("Your feedback message").setRequired(true).setMaxLength(1000),
  )
  .addStringOption((option) =>
    option
      .setName("type")
      .setDescription("Type of feedback")
      .setRequired(false)
      .addChoices(
        { name: "Bug Report", value: "bug" },
        { name: "Feature Request", value: "feature" },
        { name: "General Feedback", value: "general" },
        { name: "Complaint", value: "complaint" },
      ),
  )

// Slash command execution
export async function execute(interaction: ChatInputCommandInteraction) {
  const message = interaction.options.getString("message", true)
  const type = interaction.options.getString("type") || "general"

  try {
    await addFeedback(interaction.user.id, interaction.user.tag, message, type)

    await interaction.reply({
      content: "Thank you for your feedback! It has been recorded and will be reviewed by the developers.",
      ephemeral: true,
    })
  } catch (error) {
    await interaction.reply({
      content: "Failed to submit feedback. Please try again later.",
      ephemeral: true,
    })
  }
}
