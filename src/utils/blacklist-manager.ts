import fs from "fs"
import path from "path"
import { logger } from "./logger"

// Path to the blacklist file
const BLACKLIST_FILE = path.join(process.cwd(), "blacklist.json")

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
    if (fs.existsSync(BLACKLIST_FILE)) {
      const data = fs.readFileSync(BLACKLIST_FILE, "utf8")
      blacklist = JSON.parse(data) as BlacklistData
      logger.info("Blacklist loaded from file")
    } else {
      blacklist = { ...defaultBlacklist }
      logger.info("Blacklist initialized with default values")
      saveBlacklist()
    }
  } catch (error) {
    logger.error("Failed to load blacklist file:", error)
    blacklist = { ...defaultBlacklist }
    saveBlacklist()
  }
}

/**
 * Saves the blacklist to file
 */
function saveBlacklist(): void {
  try {
    const data = JSON.stringify(blacklist, null, 2)
    fs.writeFileSync(BLACKLIST_FILE, data, "utf8")
  } catch (error) {
    logger.error("Failed to save blacklist file:", error)
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
