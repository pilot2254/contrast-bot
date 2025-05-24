import type { Message } from "discord.js"
import { addToBlacklist, removeFromBlacklist, isBlacklisted } from "../../utils/blacklist-manager"

// Prefix command definition
export const name = "blacklist"
export const aliases = ["bl"]
export const description = "Manage user blacklist"
export const usage = "<add|remove|check> <user_id> [reason]"
export const category = "Developer"

// Prefix command execution
export async function run(message: Message, args: string[]) {
  if (args.length < 2) {
    return message.reply(`Usage: \`${name} ${usage}\``)
  }

  const action = args[0].toLowerCase()
  const userId = args[1]
  const reason = args.slice(2).join(" ") || "No reason provided"

  try {
    switch (action) {
      case "add": {
        const result = await addToBlacklist(userId, reason, message.author.id)
        if (result.success) {
          await message.reply(`✅ User ${userId} has been blacklisted. Reason: ${reason}`)
        } else {
          await message.reply(`❌ ${result.message}`)
        }
        break
      }

      case "remove": {
        const result = await removeFromBlacklist(userId)
        if (result.success) {
          await message.reply(`✅ User ${userId} has been removed from the blacklist.`)
        } else {
          await message.reply(`❌ ${result.message}`)
        }
        break
      }

      case "check": {
        const blacklisted = await isBlacklisted(userId)
        if (blacklisted) {
          await message.reply(`🚫 User ${userId} is blacklisted.`)
        } else {
          await message.reply(`✅ User ${userId} is not blacklisted.`)
        }
        break
      }

      default:
        await message.reply(`Invalid action. Use: add, remove, or check`)
    }
  } catch (error) {
    await message.reply("An error occurred while managing the blacklist.")
  }
}
