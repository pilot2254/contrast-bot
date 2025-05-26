import type { Message } from "discord.js"
import { getAllFeedback } from "../../utils/feedback-manager"
import { config } from "../../utils/config"

// Prefix command definition
export const name = "view-feedback"
export const aliases = ["feedback-list", "vf"]
export const description = "View all user feedback"
export const usage = "[limit]"
export const category = "Developer"

// Prefix command execution
export async function run(message: Message, args: string[]) {
  try {
    const feedback = await getAllFeedback()

    if (feedback.length === 0) {
      return message.reply("No feedback found.")
    }

    const limit = Number.parseInt(args[0]) || Math.min(feedback.length, 10)
    const limitedFeedback = feedback.slice(0, limit)

    let response = `📝 **${config.botName} Recent Feedback (${limitedFeedback.length} entries):**\n\n`

    limitedFeedback.forEach((entry, index) => {
      const date = new Date(entry.timestamp).toLocaleDateString()
      response += `**${index + 1}.** by ${entry.username} (${date})\n`
      response += `${entry.content}\n\n`
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
