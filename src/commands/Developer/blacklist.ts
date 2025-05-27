import type { Message } from "discord.js"
import { blacklistUser, unblacklistUser, isBlacklisted, getBlacklistedUsers } from "../../utils/blacklist-manager"
import { config } from "../../utils/config"
import { sendWebhookAlert, WEBHOOK_COLORS } from "../../utils/webhook-alerts"
import { EmbedBuilder } from "discord.js"

// Prefix command definition
export const name = "blacklist"
export const aliases = ["bl"]
export const description = "Manage user blacklist"
export const usage = "<add|remove|check|list> [user_id]"
export const category = "Developer"

// Prefix command execution
export async function run(message: Message, args: string[]) {
  if (args.length < 1) {
    return message.reply(`Usage: \`${name} ${usage}\``)
  }

  const action = args[0].toLowerCase()

  try {
    switch (action) {
      case "add": {
        if (args.length < 2) {
          return message.reply(`Usage: \`${name} add <user_id>\``)
        }

        const userId = args[1]
        const success = await blacklistUser(userId, "Blacklisted by developer", message.author.id)
        if (success) {
          await message.reply(`✅ User ${userId} has been blacklisted.`)

          // Send webhook alert
          await sendWebhookAlert({
            title: "🚫 User Blacklisted",
            description: `User has been added to the blacklist`,
            color: WEBHOOK_COLORS.WARNING,
            fields: [
              { name: "User ID", value: userId, inline: true },
              { name: "Blacklisted By", value: `${message.author.tag} (${message.author.id})`, inline: true },
            ],
          })
        } else {
          await message.reply(`❌ Failed to blacklist user or user already blacklisted.`)
        }
        break
      }

      case "remove": {
        if (args.length < 2) {
          return message.reply(`Usage: \`${name} remove <user_id>\``)
        }

        const userId = args[1]
        const success = await unblacklistUser(userId)
        if (success) {
          await message.reply(`✅ User ${userId} has been removed from the blacklist.`)

          // Send webhook alert
          await sendWebhookAlert({
            title: "✅ User Unblacklisted",
            description: `User has been removed from the blacklist`,
            color: WEBHOOK_COLORS.SUCCESS,
            fields: [
              { name: "User ID", value: userId, inline: true },
              { name: "Removed By", value: `${message.author.tag} (${message.author.id})`, inline: true },
            ],
          })
        } else {
          await message.reply(`❌ Failed to remove user from blacklist or user not blacklisted.`)
        }
        break
      }

      case "check": {
        if (args.length < 2) {
          return message.reply(`Usage: \`${name} check <user_id>\``)
        }

        const userId = args[1]
        const blacklisted = await isBlacklisted(userId)
        if (blacklisted) {
          await message.reply(`🚫 User ${userId} is blacklisted.`)
        } else {
          await message.reply(`✅ User ${userId} is not blacklisted.`)
        }
        break
      }

      case "list": {
        const blacklistedUsers = await getBlacklistedUsers()

        if (blacklistedUsers.length === 0) {
          return message.reply("📝 No users are currently blacklisted.")
        }

        const embed = new EmbedBuilder()
          .setTitle("🚫 Blacklisted Users")
          .setColor(0xff0000)
          .setDescription(`Total blacklisted users: **${blacklistedUsers.length}**`)
          .setFooter({ text: `${config.botName} • Blacklist Management` })
          .setTimestamp()

        // Process users in chunks to avoid hitting embed limits
        const userChunks = []
        for (let i = 0; i < blacklistedUsers.length; i += 10) {
          userChunks.push(blacklistedUsers.slice(i, i + 10))
        }

        for (let chunkIndex = 0; chunkIndex < userChunks.length; chunkIndex++) {
          const chunk = userChunks[chunkIndex]

          const userList = await Promise.all(
            chunk.map(async (user, index) => {
              try {
                const discordUser = await message.client.users.fetch(user.userId)
                const globalIndex = chunkIndex * 10 + index + 1
                return `**${globalIndex}.** ${discordUser.username} (${discordUser.tag})\nID: \`${user.userId}\`\nBlacklisted: <t:${Math.floor(user.timestamp / 1000)}:R>`
              } catch {
                const globalIndex = chunkIndex * 10 + index + 1
                return `**${globalIndex}.** Unknown User\nID: \`${user.userId}\`\nBlacklisted: <t:${Math.floor(user.timestamp / 1000)}:R>`
              }
            }),
          )

          embed.addFields({
            name: chunkIndex === 0 ? "Blacklisted Users" : `Blacklisted Users (continued)`,
            value: userList.join("\n\n"),
            inline: false,
          })
        }

        await message.reply({ embeds: [embed] })
        break
      }

      default:
        await message.reply(`Invalid action. Use: add, remove, check, or list`)
    }
  } catch (error) {
    await message.reply(`An error occurred while managing the ${config.botName} blacklist.`)
  }
}
