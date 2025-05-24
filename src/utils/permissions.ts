import type { User } from "discord.js"
import { logger } from "./logger"
import { config } from "./config"

// Export developer IDs for use in other files
export const DEVELOPER_IDS = config.developerIds

/**
 * Checks if a user is a developer
 * @param user The user to check
 * @returns Whether the user is a developer
 */
export function isDeveloper(user: User): boolean {
  // Hardcoded developer ID for fallback
  const HARDCODED_DEVELOPER_ID = "171395713064894465"

  // Check if user ID is in the developer list or matches the hardcoded ID
  const isDev = DEVELOPER_IDS.includes(user.id) || user.id === HARDCODED_DEVELOPER_ID

  if (isDev) {
    logger.debug(`Developer check passed for ${user.tag} (${user.id})`)
  }

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
