import type { Message } from "discord.js"
import { clearRateLimit } from "../../utils/rate-limiter"
import { logger } from "../../utils/logger"

// Prefix command definition
export const name = "clear-cooldown"
export const aliases = ["clearcooldown", "cc"]
export const description = "Clear rate limit cooldowns for a user"
export const usage = "<user_id> [command]"
export const category = "Developer"

// Prefix command execution
export async function run(message: Message, args: string[]) {
  if (args.length === 0) {
    return message.reply(`Usage: \`${name} ${usage}\``)
  }

  const userId = args[0]
  const command = args[1]

  // Validate user ID format
  if (!/^\d{17,19}$/.test(userId)) {
    return message.reply("❌ Invalid user ID format. Please provide a valid Discord user ID.")
  }

  try {
    // Try to fetch the user to validate they exist
    const targetUser = await message.client.users.fetch(userId).catch(() => null)

    if (!targetUser) {
      return message.reply("❌ User not found. Please check the user ID.")
    }

    clearRateLimit(userId, command || undefined)

    const responseMessage = command
      ? `✅ Cleared cooldown for **${command}** command for ${targetUser.tag} (${userId})`
      : `✅ Cleared all cooldowns for ${targetUser.tag} (${userId})`

    await message.reply(responseMessage)

    logger.info(`${message.author.tag} cleared cooldowns for ${targetUser.tag}${command ? ` (${command})` : ""}`)
  } catch (error) {
    logger.error("Error clearing cooldown:", error)
    await message.reply("❌ Failed to clear cooldown.")
  }
}
