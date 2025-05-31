import { Events, type Message } from "discord.js"
import { config } from "../config/config"
import { BlacklistManager } from "../utils/BlacklistManager"
import { StatsManager } from "../utils/StatsManager"
import { DevAlerts } from "../utils/DevAlerts"
import type { ExtendedClient } from "../structures/ExtendedClient"

export default {
  name: Events.MessageCreate,
  async execute(message: Message) {
    if (message.author.bot) return

    const client = message.client as ExtendedClient

    if (message.content.startsWith(config.bot.prefix)) {
      if (!config.bot.developers.includes(message.author.id)) {
        return
      }

      const args = message.content
        .slice(config.bot.prefix.length)
        .trim()
        .split(/ +/)
      const commandName = args.shift()?.toLowerCase()

      // Send dev alert
      const devAlerts = new DevAlerts(client)
      await devAlerts.sendDevCommandAlert(
        message.author.id,
        `${config.bot.prefix}${commandName}`,
        message.guild?.id
      )

      switch (commandName) {
        case "data":
          await handleDataCommand(message, client)
          break
        case "blacklist":
          await handleBlacklistCommand(message, args, client)
          break
      }
    }
  },
}

async function handleDataCommand(message: Message, client: ExtendedClient) {
  const statsManager = new StatsManager(client)
  try {
    const dbSize = await statsManager.getDatabaseSize()
    const totalCommands = await statsManager.getTotalCommandsUsed()
    const userCount = await statsManager.getUserCount()
    const economyStats = await statsManager.getEconomyStats()

    const response = `\`\`\`
📊 Database Information
━━━━━━━━━━━━━━━━━━━━━
Database Size: ${dbSize} MB
Total Users: ${userCount.toLocaleString()}
Total Commands Used: ${totalCommands.toLocaleString()}
Total Coins in Economy: ${economyStats.totalCoins.toLocaleString()}
Average User Balance: ${Math.floor(economyStats.averageBalance).toLocaleString()}
━━━━━━━━━━━━━━━━━━━━━
\`\`\``
    await message.reply(response)
  } catch (error: unknown) {
    client.logger.error("Error in data command:", error)
    await message.reply("❌ An error occurred while fetching data.")
  }
}

async function handleBlacklistCommand(
  message: Message,
  args: string[],
  client: ExtendedClient
) {
  const blacklistManager = new BlacklistManager(client)
  const subcommand = args[0]?.toLowerCase()

  if (!subcommand || !["add", "remove", "list"].includes(subcommand)) {
    await message.reply(
      "Usage: `?blacklist <add/remove/list> [user_id] [reason]`"
    )
    return
  }

  try {
    switch (subcommand) {
      case "add": {
        const userId = args[1]
        const reason = args.slice(2).join(" ") || "No reason provided"
        if (!userId) {
          await message.reply("Please provide a user ID to blacklist.")
          return
        }
        await blacklistManager.addToBlacklist(userId, reason, message.author.id)
        await message.reply(`✅ User \`${userId}\` has been blacklisted.`)
        break
      }
      case "remove": {
        const userId = args[1]
        if (!userId) {
          await message.reply(
            "Please provide a user ID to remove from blacklist."
          )
          return
        }
        await blacklistManager.removeFromBlacklist(userId)
        await message.reply(
          `✅ User \`${userId}\` has been removed from the blacklist.`
        )
        break
      }
      case "list": {
        const blacklist = await blacklistManager.getBlacklist()
        if (blacklist.length === 0) {
          await message.reply("The blacklist is empty.")
          return
        }
        let response = "```\n📋 Blacklisted Users\n━━━━━━━━━━━━━━━━━━━━━\n"
        for (const entry of blacklist) {
          const date = new Date(entry.blacklisted_at).toLocaleDateString()
          response += `ID: ${entry.user_id}\nReason: ${entry.reason}\nBy: ${entry.blacklisted_by}\nDate: ${date}\n━━━━━━━━━━━━━━━━━━━━━\n`
        }
        response += "```"

        if (response.length > 2000) {
          const chunks = response.match(/[\s\S]{1,1900}/g) || []
          for (const chunk of chunks) {
            await message.reply(chunk)
          }
        } else {
          await message.reply(response)
        }
        break
      }
    }
  } catch (error: unknown) {
    let errorMessage = "An unexpected error occurred."
    if (error instanceof Error) {
      errorMessage = error.message
    }
    client.logger.error("Error in blacklist command:", error)
    await message.reply(`❌ Error: ${errorMessage}`)
  }
}
