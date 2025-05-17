import { logger } from "./logger"
import { loadJsonData, saveJsonData, ensureDataDirectory } from "./data-directory"

// Define the stats structure
interface BotStats {
  commandsUsed: Record<string, number>
  totalCommands: number
  guildCount: number
  startTime: number
}

// Filename for stats
const STATS_FILENAME = "bot-stats.json"

// Default stats
const defaultStats: BotStats = {
  commandsUsed: {},
  totalCommands: 0,
  guildCount: 0,
  startTime: Date.now(),
}

// Stats instance
let stats: BotStats

/**
 * Initializes the stats manager
 */
export function initStats(): void {
  try {
    // Ensure the data directory exists
    ensureDataDirectory()

    // Load stats from file
    stats = loadJsonData<BotStats>(STATS_FILENAME, defaultStats)
    logger.info("Stats loaded from file")
  } catch (error) {
    logger.error("Failed to initialize stats:", error)
    stats = { ...defaultStats }
  }
}

/**
 * Saves the current stats to file
 */
export function saveStats(): void {
  try {
    saveJsonData(STATS_FILENAME, stats)
  } catch (error) {
    logger.error("Failed to save stats:", error)
  }
}

/**
 * Updates the guild count
 * @param count The new guild count
 */
export function updateGuildCount(count: number): void {
  stats.guildCount = count
  saveStats()
}

/**
 * Tracks a command usage
 * @param commandName The name of the command that was used
 */
export function trackCommand(commandName: string): void {
  if (!stats.commandsUsed[commandName]) {
    stats.commandsUsed[commandName] = 0
  }

  stats.commandsUsed[commandName]++
  stats.totalCommands++

  saveStats()
}

/**
 * Gets the current stats
 * @returns The current stats
 */
export function getStats(): BotStats {
  return stats
}

// Initialize stats when the module is imported
initStats()
