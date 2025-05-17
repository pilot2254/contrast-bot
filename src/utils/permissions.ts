import type { GuildMember, User } from "discord.js"
import { logger } from "./logger"

// List of developer user IDs - ensure they are strings
const DEVELOPER_IDS = ["171395713064894465"] // Add more IDs as needed

/**
 * Checks if a user is a developer
 * @param user The user to check
 * @returns Whether the user is a developer
 */
export function isDeveloper(user: User | GuildMember | { id: string }): boolean {
  if (!user || !user.id) {
    logger.warn("isDeveloper called with invalid user object")
    return false
  }

  // Convert ID to string to ensure consistent comparison
  const userId = String(user.id).trim()

  // Direct ID check for critical developer
  if (userId === "171395713064894465") {
    return true
  }

  // Check if the user ID is in the developer IDs array
  const isDev = DEVELOPER_IDS.includes(userId)

  // Log the check for debugging
  logger.debug(`Developer check - User ID: "${userId}" - Result: ${isDev}`)

  return isDev
}

/**
 * Logs an unauthorized attempt to use a developer command
 * @param userId The ID of the user who attempted to use the command
 * @param commandName The name of the command that was attempted
 */
export function logUnauthorizedAttempt(userId: string, commandName: string): void {
  logger.warn(`Unauthorized attempt to use developer command ${commandName} by user ${userId}`)
}
