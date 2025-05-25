import { type User, type TextChannel, EmbedBuilder } from "discord.js"
import { logger } from "./logger"
import { botInfo } from "./bot-info"

// Reminder data structure
interface Reminder {
  id: string
  userId: string
  channelId: string
  message: string
  timestamp: number
  timeout: NodeJS.Timeout
}

// Active reminders
const reminders = new Map<string, Reminder>()

/**
 * Creates a new reminder
 */
export function createReminder(user: User, channel: TextChannel, message: string, delay: number): Reminder {
  const id = Math.random().toString(36).substring(2, 15)
  const timestamp = Date.now() + delay

  const timeout = setTimeout(() => {
    sendReminder(id)
  }, delay)

  const reminder: Reminder = {
    id,
    userId: user.id,
    channelId: channel.id,
    message,
    timestamp,
    timeout,
  }

  reminders.set(id, reminder)
  logger.info(`Created reminder ${id} for user ${user.tag} in ${delay}ms`)

  return reminder
}

/**
 * Cancels a reminder
 */
export function cancelReminder(id: string): boolean {
  const reminder = reminders.get(id)
  if (!reminder) {
    return false
  }

  clearTimeout(reminder.timeout)
  reminders.delete(id)
  logger.info(`Cancelled reminder ${id}`)

  return true
}

/**
 * Gets all reminders for a user
 */
export function getUserReminders(userId: string): Reminder[] {
  return Array.from(reminders.values()).filter((reminder) => reminder.userId === userId)
}

/**
 * Sends a reminder
 */
async function sendReminder(id: string): Promise<void> {
  const reminder = reminders.get(id)
  if (!reminder) {
    return
  }

  try {
    const client = (global as any).client
    if (!client) {
      logger.error(`Failed to send reminder ${id}: Client not available`)
      return
    }

    const channel = (await client.channels.fetch(reminder.channelId)) as TextChannel
    if (!channel) {
      logger.error(`Failed to send reminder ${id}: Channel not found`)
      return
    }

    const embed = new EmbedBuilder()
      .setTitle("Reminder")
      .setDescription(reminder.message)
      .setColor(botInfo.colors.primary)
      .addFields({
        name: "Set",
        value: `<t:${Math.floor(reminder.timestamp / 1000) - Math.floor(reminder.timestamp - Date.now()) / 1000}:R>`,
      })
      .setFooter({ text: `Reminder for <@${reminder.userId}>` })
      .setTimestamp()

    await channel.send({ content: `<@${reminder.userId}>, here's your reminder:`, embeds: [embed] })
    logger.info(`Sent reminder ${id} to user ${reminder.userId}`)
  } catch (error) {
    logger.error(`Failed to send reminder ${id}:`, error)
  } finally {
    reminders.delete(id)
  }
}
