import { getDb } from "./database"
import { logger } from "./logger"

/**
 * Checks if a user is blacklisted
 * @param userId The ID of the user to check
 * @returns Whether the user is blacklisted
 */
export async function isBlacklisted(userId: string): Promise<boolean> {
  try {
    const db = await getDb()
    const result = await db.get("SELECT * FROM blacklisted_users WHERE userId = ?", [userId])
    return !!result
  } catch (error) {
    logger.error("Error checking if user is blacklisted:", error)
    return false
  }
}

/**
 * Adds a user to the blacklist
 * @param userId The ID of the user to blacklist
 * @param reason The reason for blacklisting
 * @param blacklistedBy The ID of the user who blacklisted
 * @returns Whether the operation was successful
 */
export async function blacklistUser(
  userId: string,
  reason = "No reason provided",
  blacklistedBy = "Unknown",
): Promise<boolean> {
  try {
    const db = await getDb()

    // Check if user is already blacklisted
    const existing = await db.get("SELECT * FROM blacklisted_users WHERE userId = ?", [userId])
    if (existing) {
      return false
    }

    // Add user to blacklist
    await db.run("INSERT INTO blacklisted_users (userId, reason, blacklistedBy, timestamp) VALUES (?, ?, ?, ?)", [
      userId,
      reason,
      blacklistedBy,
      Date.now(),
    ])

    logger.info(`User ${userId} blacklisted by ${blacklistedBy} for reason: ${reason}`)
    return true
  } catch (error) {
    logger.error("Error blacklisting user:", error)
    return false
  }
}

/**
 * Removes a user from the blacklist
 * @param userId The ID of the user to unblacklist
 * @returns Whether the operation was successful
 */
export async function unblacklistUser(userId: string): Promise<boolean> {
  try {
    const db = await getDb()

    // Check if user is blacklisted
    const existing = await db.get("SELECT * FROM blacklisted_users WHERE userId = ?", [userId])
    if (!existing) {
      return false
    }

    // Remove user from blacklist
    await db.run("DELETE FROM blacklisted_users WHERE userId = ?", [userId])

    logger.info(`User ${userId} removed from blacklist`)
    return true
  } catch (error) {
    logger.error("Error unblacklisting user:", error)
    return false
  }
}

/**
 * Gets all blacklisted users
 * @returns An array of blacklisted users
 */
export async function getBlacklistedUsers(): Promise<
  { userId: string; reason: string; blacklistedBy: string; timestamp: number }[]
> {
  try {
    const db = await getDb()
    const users = await db.all("SELECT * FROM blacklisted_users")
    return users
  } catch (error) {
    logger.error("Error getting blacklisted users:", error)
    return []
  }
}

/**
 * Sets the maintenance mode
 * @param enabled Whether maintenance mode should be enabled
 * @returns Whether the operation was successful
 */
export async function setMaintenanceMode(enabled: boolean): Promise<boolean> {
  try {
    const db = await getDb()
    await db.run(
      "INSERT INTO bot_settings (key, value) VALUES ('maintenance_mode', ?) ON CONFLICT(key) DO UPDATE SET value = ?",
      [enabled.toString(), enabled.toString()],
    )
    logger.info(`Maintenance mode ${enabled ? "enabled" : "disabled"}`)
    return true
  } catch (error) {
    logger.error("Error setting maintenance mode:", error)
    return false
  }
}

/**
 * Checks if maintenance mode is enabled
 * @returns Whether maintenance mode is enabled
 */
export async function isMaintenanceMode(): Promise<boolean> {
  try {
    const db = await getDb()
    const result = await db.get("SELECT value FROM bot_settings WHERE key = 'maintenance_mode'")
    return result?.value === "true"
  } catch (error) {
    logger.error("Error checking maintenance mode:", error)
    return false
  }
}
