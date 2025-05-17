import { Events, type Message } from "discord.js"
import { config } from "../utils/config"
import { logger } from "../utils/logger"
import { trackCommand } from "../utils/stats-manager"
import { isBlacklisted, isMaintenanceMode } from "../utils/blacklist-manager"
import { isDeveloper } from "../utils/permissions"

export const name = Events.MessageCreate
export const once = false

export async function execute(message: Message) {
  // Handle bot mention
  if (message.mentions.has(message.client.user!) && !message.author.bot) {
    // Check if this is a direct mention (not just a mention in a message with other content)
    const isDirect =
      message.content.trim() === `<@${message.client.user!.id}>` ||
      message.content.trim() === `<@!${message.client.user!.id}>`

    if (isDirect) {
      try {
        // Get a random response from the list
        const response = getBotMentionResponse(message.author.username, config.botName)
        await message.reply(response)
        logger.info(`Responded to mention from ${message.author.tag}`)
      } catch (error) {
        logger.error("Error responding to mention:", error)
      }
      return
    }
  }

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

/**
 * Gets a random response for when the bot is mentioned
 * @param username The username of the person who mentioned the bot
 * @param botName The name of the bot
 * @returns A random response string
 */
function getBotMentionResponse(username: string, botName: string): string {
  const responses = [
    `Hey ${username}! I'm ${botName}, a utility bot. I don't have AI capabilities to chat, but I can help with various commands. Try \`${config.prefix}help\` to see what I can do!`,

    `Hello there, ${username}! Unlike AI chatbots, I can't hold conversations. However, I have many useful commands you can use. Type \`${config.prefix}help\` to discover them!`,

    `Hi ${username}! I'm ${botName}, but I'm not an AI chatbot. I'm a utility bot with specific commands. Check out \`${config.prefix}help\` to see all my features!`,

    `Greetings, ${username}! I notice you've pinged me, but I'm not designed for open-ended conversations. I'm here to help with specific commands though! Try \`${config.prefix}help\` to see what I can do.`,

    `${username}, thanks for the mention! While I can't chat like an AI, I have many useful commands. Use \`${config.prefix}help\` to explore my capabilities!`,
  ]

  // Return a random response from the list
  return responses[Math.floor(Math.random() * responses.length)]
}