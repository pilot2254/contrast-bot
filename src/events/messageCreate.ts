import { Events, type Message } from "discord.js"
import { config } from "../utils/config"
import { logger } from "../utils/logger"
import { trackCommand } from "../utils/stats-manager"
import { isBlacklisted, isMaintenanceMode } from "../utils/blacklist-manager"
import { isDeveloper } from "../utils/permissions"

export const name = Events.MessageCreate
export const once = false

export async function execute(message: Message): Promise<void> {
  // Handle bot mention (in servers, DMs, and group chats)
  try {
    // Import the mention handler dynamically to avoid circular dependencies
    const { handleBotMention } = await import("../utils/mention-response")
    const wasMention = await handleBotMention(message)
    if (wasMention) return
  } catch (error) {
    logger.error("Error importing or using mention handler:", error)
  }

  // Ignore messages from bots or without the prefix
  if (message.author.bot || !message.content.startsWith(config.prefix)) return

  // Parse command and arguments
  const args = message.content.slice(config.prefix.length).trim().split(/ +/)
  const commandName = args.shift()?.toLowerCase()

  if (!commandName) return

  // Find command by name or alias (only developer commands use prefix now)
  const command =
    message.client.prefixCommands.get(commandName) ||
    [...message.client.prefixCommands.values()].find((cmd) => cmd.aliases?.includes(commandName))

  if (!command) {
    // If it's not a developer command, suggest using slash commands
    if (!isDeveloper(message.author)) {
      await message.reply(`This bot uses slash commands! Try \`/help\` to see available ${config.botName} commands.`)
    }
    return
  }

  // Check if user is a developer (since all prefix commands are now developer-only)
  if (!isDeveloper(message.author)) {
    await message.reply(`${config.botName} developer commands can only be used by bot developers.`)
    return
  }

  // Check if user is blacklisted
  const blacklisted = await isBlacklisted(message.author.id)
  if (blacklisted) {
    await message.reply(`You have been blacklisted from using ${config.botName}.`)
    return
  }

  // Check if maintenance mode is enabled (developers can bypass)
  const maintenanceMode = await isMaintenanceMode()
  if (maintenanceMode && !isDeveloper(message.author)) {
    await message.reply(`${config.botName} is currently in maintenance mode. Please try again later.`)
    return
  }

  // Execute command
  try {
    // Track command usage
    await trackCommand(command.name || commandName)

    // Execute the command
    if (command.run) {
      await command.run(message, args)
    } else {
      logger.warn(`Developer command ${commandName} has no run method.`)
      await message.reply("This command is not properly implemented.")
    }
  } catch (error) {
    logger.error(`Error executing developer command ${commandName}:`, error)
    await message.reply("There was an error while executing this command!").catch((e) => {
      logger.error("Failed to send error reply:", e)
    })
  }
}
