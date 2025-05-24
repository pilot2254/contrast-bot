import type { Message } from "discord.js"
import { getAllFeedback } from "../../utils/feedback-manager"

// Prefix command definition
export const name = "view-feedback"
export const aliases = ["feedback-list", "vf"]
export const description = "View all user feedback"
export const usage = "[limit]"
export const category = "Developer"

// Prefix command execution
export async function run(message: Message, args: string[]) {
  try {
    const limit = Number.parseInt(args[0]) || 10
    const feedback = await getAllFeedback(limit)

    if (feedback.length === 0) {
      return message.reply("No feedback found.")
    }

    let response = `📝 **Recent Feedback (${feedback.length} entries):**\n\n`

    feedback.forEach((entry, index) => {
      const date = new Date(entry.createdAt).toLocaleDateString()
      response += `**${index + 1}.** [${entry.type.toUpperCase()}] by ${entry.userTag} (${date})\n`
      response += `${entry.message}\n\n`
    })

    // Split message if too long
    if (response.length > 2000) {
      const chunks = response.match(/[\s\S]{1,2000}/g) || []
      for (const chunk of chunks) {
        await message.reply(chunk)
      }
    } else {
      await message.reply(response)
    }
  } catch (error) {
    await message.reply("❌ An error occurred while fetching feedback.")
  }
}
