import { Events, type Message } from "discord.js"
import { config } from "../utils/config"
import { logger } from "../utils/logger"
import { trackCommand } from "../utils/stats-manager"
import { isBlacklisted, isMaintenanceMode } from "../utils/blacklist-manager"
import { isDeveloper } from "../utils/permissions"

export const name = Events.MessageCreate
export const once = false

export async function execute(message: Message) {
  // Ignore messages from bots or without the prefix
  if (message.author.bot || !message.content.startsWith(config.prefix)) return

  // Parse command and arguments
  const args = message.content.slice(config.prefix.length).trim().split(/ +/)
  const commandName = args.shift()?.toLowerCase()

  if (!commandName) return

  // Find command by name or alias
  const command =
    message.client.prefixCommands.get(commandName) ||
    [...message.client.prefixCommands.values()].find((cmd) => cmd.aliases?.includes(commandName))

  if (!command || !command.run) return

  // Check if user is blacklisted
  if (isBlacklisted(message.author.id)) {
    return message.reply("You have been blacklisted from using this bot.")
  }

  // Check if maintenance mode is enabled (allow developers to bypass)
  if (isMaintenanceMode() && !isDeveloper(message.author)) {
    return message.reply("The bot is currently in maintenance mode. Please try again later.")
  }

  // Execute command
  try {
    // Track command usage
    trackCommand(command.name || commandName)

    await command.run(message, args)
  } catch (error) {
    logger.error(`Error executing prefix command ${commandName}:`, error)
    await message.reply("There was an error while executing this command!")
  }
}