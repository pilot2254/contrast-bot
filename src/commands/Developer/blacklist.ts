import { type Message, EmbedBuilder } from "discord.js"
import { config } from "../../utils/config"
import { blacklistUser, unblacklistUser, getBlacklistedUsers, isBlacklisted } from "../../utils/blacklist-manager"
import { logger } from "../../utils/logger"
import { botInfo } from "../../utils/bot-info"
import { isDeveloper } from "../../utils/permissions"

// Prefix command definition
export const name = "blacklist"
export const aliases = ["bl"]
export const description = "Manage blacklisted users"
export const usage = "add <user> <reason> | remove <user> | list | check <user>"

// Prefix command execution
export async function run(message: Message, args: string[]) {
  try {
    // Check if user is a developer
    if (!isDeveloper(message.author)) {
      return message.reply("You don't have permission to use this command!")
    }

    if (args.length === 0) {
      return message.reply(
        `Usage:\n${config.prefix}blacklist add <user> <reason>\n${config.prefix}blacklist remove <user>\n${config.prefix}blacklist list\n${config.prefix}blacklist check <user>`,
      )
    }

    const subcommand = args[0].toLowerCase()

    if (subcommand === "add") {
      if (args.length < 3) {
        return message.reply(`Usage: ${config.prefix}blacklist add <user> <reason>`)
      }

      const userId = args[1].replace(/[<@!>]/g, "")
      const reason = args.slice(2).join(" ")

      try {
        const user = await message.client.users.fetch(userId)

        // Don't allow blacklisting developers
        if (isDeveloper(user)) {
          return message.reply("You cannot blacklist a developer!")
        }

        const success = await blacklistUser(user.id, reason, message.author.id)

        if (success) {
          const embed = new EmbedBuilder()
            .setTitle("User Blacklisted")
            .setDescription(`${user.tag} has been blacklisted.`)
            .addFields({ name: "Reason", value: reason })
            .setColor(botInfo.colors.error)
            .setTimestamp()

          await message.reply({ embeds: [embed] })
        } else {
          await message.reply("Failed to blacklist user!")
        }
      } catch (error) {
        await message.reply("Invalid user ID!")
      }
    } else if (subcommand === "remove") {
      if (args.length < 2) {
        return message.reply(`Usage: ${config.prefix}blacklist remove <user>`)
      }

      const userId = args[1].replace(/[<@!>]/g, "")

      try {
        const user = await message.client.users.fetch(userId)
        const success = await unblacklistUser(user.id)

        if (success) {
          const embed = new EmbedBuilder()
            .setTitle("User Unblacklisted")
            .setDescription(`${user.tag} has been removed from the blacklist.`)
            .setColor(botInfo.colors.success)
            .setTimestamp()

          await message.reply({ embeds: [embed] })
        } else {
          await message.reply("Failed to unblacklist user! They may not be blacklisted.")
        }
      } catch (error) {
        await message.reply("Invalid user ID!")
      }
    } else if (subcommand === "list") {
      const blacklistedUsers = await getBlacklistedUsers()

      if (blacklistedUsers.length === 0) {
        return message.reply("There are no blacklisted users.")
      }

      // Fetch user objects for all blacklisted users
      const userPromises = blacklistedUsers.map((user) => message.client.users.fetch(user.userId).catch(() => null))
      const users = await Promise.all(userPromises)
      const validUsers = users.filter((user): user is NonNullable<typeof user> => user !== null)

      const embed = new EmbedBuilder()
        .setTitle("Blacklisted Users")
        .setDescription(
          validUsers.length > 0
            ? validUsers.map((user) => `${user.tag} (${user.id})`).join("\n")
            : "No valid users found in blacklist.",
        )
        .setColor(botInfo.colors.primary)
        .setTimestamp()

      await message.reply({ embeds: [embed] })
    } else if (subcommand === "check") {
      if (args.length < 2) {
        return message.reply(`Usage: ${config.prefix}blacklist check <user>`)
      }

      const userId = args[1].replace(/[<@!>]/g, "")

      try {
        const user = await message.client.users.fetch(userId)
        const isUserBlacklisted = await isBlacklisted(user.id)

        const embed = new EmbedBuilder()
          .setTitle("Blacklist Check")
          .setDescription(isUserBlacklisted ? `${user.tag} is blacklisted.` : `${user.tag} is not blacklisted.`)
          .setColor(isUserBlacklisted ? botInfo.colors.error : botInfo.colors.success)
          .setTimestamp()

        await message.reply({ embeds: [embed] })
      } catch (error) {
        await message.reply("Invalid user ID!")
      }
    } else {
      await message.reply(
        `Unknown subcommand! Usage:\n${config.prefix}blacklist add <user> <reason>\n${config.prefix}blacklist remove <user>\n${config.prefix}blacklist list\n${config.prefix}blacklist check <user>`,
      )
    }
  } catch (error) {
    logger.error("Error executing blacklist command:", error)
    await message.reply("There was an error while executing this command!")
  }
}
