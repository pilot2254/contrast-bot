import { type Message, EmbedBuilder } from "discord.js"
import { botInfo } from "../../utils/bot-info"
import { getAllFeedback, getFeedbackById } from "../../utils/feedback-manager"
import { isDeveloper, logUnauthorizedAttempt } from "../../utils/permissions"

// Prefix command definition
export const name = "view-feedback"
export const aliases = ["viewfeedback", "feedback-list"]
export const description = "View user feedback (Developer only)"
export const usage = "list [limit] | get <id>"

// Prefix command execution
export async function run(message: Message, args: string[]) {
  // Check if user is a developer
  if (!isDeveloper(message.author)) {
    logUnauthorizedAttempt(message.author.id, "view-feedback")
    return message.reply("You don't have permission to use this command.")
  }

  if (!args.length) {
    return message.reply(`Usage: ${usage}`)
  }

  const subcommand = args[0].toLowerCase()

  if (subcommand === "list") {
    const limit = args[1] ? Number.parseInt(args[1]) : 10

    if (isNaN(limit) || limit < 1 || limit > 25) {
      return message.reply("Please provide a valid limit between 1 and 25.")
    }

    const feedback = await getAllFeedback()

    if (feedback.length === 0) {
      return message.reply("No feedback has been submitted yet.")
    }

    // Sort by newest first
    feedback.sort((a, b) => b.timestamp - a.timestamp)

    // Take only the requested number of entries
    const recentFeedback = feedback.slice(0, limit)

    const embed = new EmbedBuilder()
      .setTitle("Recent Feedback")
      .setColor(botInfo.colors.primary)
      .setDescription(
        recentFeedback
          .map(
            (f) =>
              `**#${f.id}** - From ${f.username} - <t:${Math.floor(f.timestamp / 1000)}:R>\n${f.content.substring(0, 100)}${f.content.length > 100 ? "..." : ""}`,
          )
          .join("\n\n"),
      )
      .setFooter({ text: `Showing ${recentFeedback.length} of ${feedback.length} feedback entries` })
      .setTimestamp()

    await message.reply({ embeds: [embed] })
  } else if (subcommand === "get") {
    if (args.length < 2) {
      return message.reply("Please provide a feedback ID.")
    }

    const id = Number.parseInt(args[1])

    if (isNaN(id) || id < 1) {
      return message.reply("Please provide a valid feedback ID.")
    }

    const feedback = await getFeedbackById(id)

    if (!feedback) {
      return message.reply(`Feedback #${id} not found.`)
    }

    const embed = new EmbedBuilder()
      .setTitle(`Feedback #${feedback.id}`)
      .setColor(botInfo.colors.primary)
      .addFields(
        { name: "From", value: feedback.username, inline: true },
        { name: "User ID", value: feedback.userId, inline: true },
        { name: "Submitted", value: `<t:${Math.floor(feedback.timestamp / 1000)}:F>`, inline: true },
        { name: "Content", value: feedback.content },
      )
      .setFooter({ text: `Requested by ${message.author.tag}` })
      .setTimestamp()

    await message.reply({ embeds: [embed] })
  } else {
    await message.reply(`Unknown subcommand. Usage: ${usage}`)
  }
}
