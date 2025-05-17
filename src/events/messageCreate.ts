import { Events, type Message } from "discord.js"
import { config } from "../utils/config"
import { logger } from "../utils/logger"

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

  // Execute command
  try {
    await command.run(message, args)
  } catch (error) {
    logger.error(`Error executing prefix command ${commandName}:`, error)
    await message.reply("There was an error while executing this command!")
  }
}