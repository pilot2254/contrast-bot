import type { Message } from "discord.js"
import { config } from "./config"
import { logger } from "./logger"

/**
 * Handles responses when the bot is mentioned
 * @param message The message that mentioned the bot
 * @returns Whether the message was handled as a mention
 */
export async function handleBotMention(message: Message): Promise<boolean> {
  try {
    // Skip messages from bots
    if (message.author.bot) return false

    // Get the bot user
    const botUser = message.client.user
    if (!botUser) return false

    // Different mention detection for different contexts
    let isMention = false

    // Check if this is a direct mention
    const mentionRegex = new RegExp(`^<@!?${botUser.id}>$`)
    isMention = mentionRegex.test(message.content.trim())

    // Additional check for DMs - any message in a DM could be considered directed at the bot
    if (!isMention && !message.guild && message.channel.type === 1) {
      // In DMs, consider any message as directed to the bot
      // But we'll still check if it's not a command to avoid double responses
      if (!message.content.startsWith(config.prefix)) {
        isMention = true
      }
    }

    if (!isMention) return false

    // Get a random response from the list
    const response = getBotMentionResponse(message.author.username, config.botName)
    await message.reply(response)

    // Log with channel context
    const channelContext = message.guild
      ? `server: ${message.guild.name}`
      : message.channel.type === 1
        ? "DM"
        : "Group DM"

    logger.info(`Responded to mention from ${message.author.tag} in ${channelContext}`)
    return true
  } catch (error) {
    logger.error("Error responding to mention:", error)
    return false
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