import { getDb } from "./database"
import { logger } from "./logger"

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

export async function blacklistUser(
  userId: string,
  reason = "No reason provided",
  blacklistedBy = "Unknown",
): Promise<boolean> {
  try {
    const db = await getDb()

    // Check if already blacklisted
    const existing = await db.get("SELECT * FROM blacklisted_users WHERE userId = ?", [userId])
    if (existing) {
      return false
    }

    // Add to blacklist
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

export async function unblacklistUser(userId: string): Promise<boolean> {
  try {
    const db = await getDb()

    // Check if blacklisted
    const existing = await db.get("SELECT * FROM blacklisted_users WHERE userId = ?", [userId])
    if (!existing) {
      return false
    }

    // Remove from blacklist
    await db.run("DELETE FROM blacklisted_users WHERE userId = ?", [userId])
    logger.info(`User ${userId} removed from blacklist`)
    return true
  } catch (error) {
    logger.error("Error unblacklisting user:", error)
    return false
  }
}

export async function getBlacklistedUsers(): Promise<
  { userId: string; reason: string; blacklistedBy: string; timestamp: number }[]
> {
  try {
    const db = await getDb()
    return await db.all("SELECT * FROM blacklisted_users")
  } catch (error) {
    logger.error("Error getting blacklisted users:", error)
    return []
  }
}

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
