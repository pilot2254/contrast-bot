import { getDb } from "./database"
import { logger } from "./logger"
import { loadJsonData, saveJsonData, ensureDataDirectory } from "./data-directory"

// Filename for blacklist
const BLACKLIST_FILENAME = "blacklist.json"

// Blacklist data structure
interface BlacklistData {
  users: string[]
  maintenanceMode: boolean
}

// Default blacklist data
const defaultBlacklist: BlacklistData = {
  users: [],
  maintenanceMode: false,
}

// Blacklist instance
let blacklist: BlacklistData

/**
 * Initializes the blacklist
 */
export async function initBlacklist(): Promise<void> {
  try {
    // Ensure the data directory exists
    ensureDataDirectory()

    // Load blacklist from file
    blacklist = loadJsonData<BlacklistData>(BLACKLIST_FILENAME, defaultBlacklist)
    logger.info("Blacklist loaded from file")
  } catch (error) {
    logger.error("Failed to initialize blacklist:", error)
    blacklist = { ...defaultBlacklist }
    saveBlacklist()
  }
}

/**
 * Saves the blacklist to file
 */
function saveBlacklist(): void {
  try {
    saveJsonData(BLACKLIST_FILENAME, blacklist)
  } catch (error) {
    logger.error("Failed to save blacklist:", error)
  }
}

/**
 * Adds a user to the blacklist
 * @param userId The ID of the user to blacklist
 * @param reason The reason for blacklisting (optional)
 * @param addedBy The ID of the user who added the blacklist (optional)
 * @returns True if the user was added, false if they were already blacklisted
 */
export async function blacklistUser(userId: string, reason?: string, addedBy?: string): Promise<boolean> {
  try {
    const db = getDb()

    // Check if user is already blacklisted
    const existingUser = await db.get("SELECT 1 FROM blacklist WHERE user_id = ?", userId)
    if (existingUser) {
      return false
    }

    // Add user to blacklist
    await db.run(
      "INSERT INTO blacklist (user_id, reason, added_at, added_by) VALUES (?, ?, ?, ?)",
      userId,
      reason || "No reason provided",
      Date.now(),
      addedBy || null,
    )

    logger.info(`User ${userId} added to blacklist`)
    return true
  } catch (error) {
    logger.error(`Failed to blacklist user ${userId}:`, error)
    return false
  }
}

/**
 * Removes a user from the blacklist
 * @param userId The ID of the user to unblacklist
 * @returns True if the user was removed, false if they weren't blacklisted
 */
export async function unblacklistUser(userId: string): Promise<boolean> {
  try {
    const db = getDb()

    // Remove user from blacklist
    const result = await db.run("DELETE FROM blacklist WHERE user_id = ?", userId)

    // Check if any rows were affected (changes property might be undefined)
    if (result && result.changes && result.changes > 0) {
      logger.info(`User ${userId} removed from blacklist`)
      return true
    }

    return false
  } catch (error) {
    logger.error(`Failed to unblacklist user ${userId}:`, error)
    return false
  }
}

/**
 * Checks if a user is blacklisted
 * @param userId The ID of the user to check
 * @returns Whether the user is blacklisted
 */
export async function isBlacklisted(userId: string): Promise<boolean> {
  try {
    const db = getDb()
    const user = await db.get("SELECT 1 FROM blacklist WHERE user_id = ?", userId)
    return !!user
  } catch (error) {
    logger.error(`Failed to check if user ${userId} is blacklisted:`, error)
    return false
  }
}

/**
 * Gets the list of blacklisted users
 * @returns Array of blacklisted user IDs with reasons and timestamps
 */
export async function getBlacklistedUsers(): Promise<
  Array<{
    userId: string
    reason: string
    addedAt: number
    addedBy: string | null
  }>
> {
  try {
    const db = getDb()
    const users = await db.all("SELECT user_id, reason, added_at, added_by FROM blacklist")

    return users.map((user) => ({
      userId: user.user_id,
      reason: user.reason,
      addedAt: user.added_at,
      addedBy: user.added_by,
    }))
  } catch (error) {
    logger.error("Failed to get blacklisted users:", error)
    return []
  }
}

/**
 * Sets the maintenance mode
 * @param enabled Whether maintenance mode should be enabled
 */
export async function setMaintenanceMode(enabled: boolean): Promise<void> {
  try {
    const db = getDb()
    await db.run("UPDATE maintenance_mode SET enabled = ?, updated_at = ? WHERE id = 1", enabled ? 1 : 0, Date.now())

    logger.info(`Maintenance mode ${enabled ? "enabled" : "disabled"}`)
  } catch (error) {
    logger.error("Failed to set maintenance mode:", error)
  }
}

/**
 * Checks if maintenance mode is enabled
 * @returns Whether maintenance mode is enabled
 */
export async function isMaintenanceMode(): Promise<boolean> {
  try {
    const db = getDb()
    const result = await db.get("SELECT enabled FROM maintenance_mode WHERE id = 1")
    return result?.enabled === 1
  } catch (error) {
    logger.error("Failed to check maintenance mode:", error)
    return false
  }
}

// Initialize blacklist when the module is imported
initBlacklist()
