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
export function initBlacklist(): void {
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
 * @returns True if the user was added, false if they were already blacklisted
 */
export function blacklistUser(userId: string): boolean {
  if (blacklist.users.includes(userId)) {
    return false
  }

  blacklist.users.push(userId)
  saveBlacklist()
  return true
}

/**
 * Removes a user from the blacklist
 * @param userId The ID of the user to unblacklist
 * @returns True if the user was removed, false if they weren't blacklisted
 */
export function unblacklistUser(userId: string): boolean {
  const index = blacklist.users.indexOf(userId)
  if (index === -1) {
    return false
  }

  blacklist.users.splice(index, 1)
  saveBlacklist()
  return true
}

/**
 * Checks if a user is blacklisted
 * @param userId The ID of the user to check
 * @returns Whether the user is blacklisted
 */
export function isBlacklisted(userId: string): boolean {
  return blacklist.users.includes(userId)
}

/**
 * Gets the list of blacklisted users
 * @returns Array of blacklisted user IDs
 */
export function getBlacklistedUsers(): string[] {
  return [...blacklist.users]
}

/**
 * Sets the maintenance mode
 * @param enabled Whether maintenance mode should be enabled
 */
export function setMaintenanceMode(enabled: boolean): void {
  blacklist.maintenanceMode = enabled
  saveBlacklist()
}

/**
 * Checks if maintenance mode is enabled
 * @returns Whether maintenance mode is enabled
 */
export function isMaintenanceMode(): boolean {
  return blacklist.maintenanceMode
}

// Initialize blacklist when the module is imported
initBlacklist()
