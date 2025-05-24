import type { Message } from "discord.js"
import { config } from "../../utils/config"

// Prefix command definition
export const name = "dev-role"
export const aliases = ["devrole"]
export const description = "Manage developer role in the current server"
export const usage = "<add|remove> <user> [role_name]"
export const category = "Developer"

// Prefix command execution
export async function run(message: Message, args: string[]) {
  if (!message.guild) {
    return message.reply("This command can only be used in a server.")
  }

  if (args.length < 2) {
    return message.reply(`Usage: \`${name} ${usage}\``)
  }

  const action = args[0].toLowerCase()
  const userMention = args[1]
  const roleName = args.slice(2).join(" ") || "Bot Developer"

  try {
    // Parse user ID from mention or direct ID
    const userId = userMention.replace(/[<@!>]/g, "")
    const member = await message.guild.members.fetch(userId).catch(() => null)

    if (!member) {
      return message.reply("User not found in this server.")
    }

    switch (action) {
      case "add": {
        // Find or create the developer role
        let role = message.guild.roles.cache.find((r) => r.name === roleName)

        if (!role) {
          role = await message.guild.roles.create({
            name: roleName,
            color: config.botInfo?.colors?.primary || "Blue",
            permissions: [],
            reason: "Developer role created by bot",
          })
        }

        if (member.roles.cache.has(role.id)) {
          return message.reply(`${member.user.tag} already has the ${roleName} role.`)
        }

        await member.roles.add(role)
        await message.reply(`✅ Added ${roleName} role to ${member.user.tag}`)
        break
      }

      case "remove": {
        const role = message.guild.roles.cache.find((r) => r.name === roleName)

        if (!role) {
          return message.reply(`Role "${roleName}" not found.`)
        }

        if (!member.roles.cache.has(role.id)) {
          return message.reply(`${member.user.tag} doesn't have the ${roleName} role.`)
        }

        await member.roles.remove(role)
        await message.reply(`✅ Removed ${roleName} role from ${member.user.tag}`)
        break
      }

      default:
        await message.reply("Invalid action. Use: add or remove")
    }
  } catch (error) {
    await message.reply("❌ An error occurred while managing the developer role.")
  }
}
