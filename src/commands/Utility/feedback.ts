import { SlashCommandBuilder, type ChatInputCommandInteraction, type Message, EmbedBuilder } from "discord.js"
import { botInfo } from "../../utils/bot-info"
import { addFeedback } from "../../utils/feedback-manager"

// Slash command definition
export const data = new SlashCommandBuilder()
  .setName("feedback")
  .setDescription("Submit feedback about the bot")
  .addStringOption((option) => option.setName("content").setDescription("Your feedback").setRequired(true))

// Slash command execution
export async function execute(interaction: ChatInputCommandInteraction) {
  const content = interaction.options.getString("content", true)

  // Check if feedback is too short
  if (content.length < 10) {
    return interaction.reply({
      content: "Your feedback is too short. Please provide more details.",
      ephemeral: true,
    })
  }

  // Add feedback
  const feedback = await addFeedback(interaction.user.id, interaction.user.username, content)

  const embed = new EmbedBuilder()
    .setTitle("Feedback Submitted")
    .setDescription("Thank you for your feedback! It has been recorded and will be reviewed by the bot developers.")
    .setColor(botInfo.colors.success)
    .addFields(
      { name: "Feedback ID", value: `#${feedback.id}`, inline: true },
      { name: "Content", value: feedback.content },
    )
    .setFooter({ text: `Submitted by ${interaction.user.tag}` })
    .setTimestamp()

  await interaction.reply({ embeds: [embed], ephemeral: true })

  // If this is in a guild, let the user know it was submitted privately
  if (interaction.guild) {
    await interaction.followUp({
      content: "Your feedback has been submitted privately.",
      ephemeral: false,
    })
  }
}

// Prefix command definition
export const name = "feedback"
export const aliases = ["suggest"]
export const description = "Submit feedback about the bot"
export const usage = "<your feedback>"

// Prefix command execution
export async function run(message: Message, args: string[]) {
  if (!args.length) {
    return message.reply(`Usage: ${usage}`)
  }

  const content = args.join(" ")

  // Check if feedback is too short
  if (content.length < 10) {
    return message.reply("Your feedback is too short. Please provide more details.")
  }

  // Add feedback
  const feedback = await addFeedback(message.author.id, message.author.username, content)

  const embed = new EmbedBuilder()
    .setTitle("Feedback Submitted")
    .setDescription("Thank you for your feedback! It has been recorded and will be reviewed by the bot developers.")
    .setColor(botInfo.colors.success)
    .addFields(
      { name: "Feedback ID", value: `#${feedback.id}`, inline: true },
      { name: "Content", value: feedback.content },
    )
    .setFooter({ text: `Submitted by ${message.author.tag}` })
    .setTimestamp()

  // Send a DM to the user if possible
  try {
    await message.author.send({ embeds: [embed] })
    await message.reply("Your feedback has been submitted. Check your DMs for details.")
  } catch {
    // If DM fails, just reply in the channel
    await message.reply({ embeds: [embed] })
  }
}
