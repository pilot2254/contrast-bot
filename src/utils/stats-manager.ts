import fs from "fs"
import path from "path"
import { logger } from "./logger"

// Define the stats structure
interface BotStats {
  commandsUsed: Record<string, number>
  totalCommands: number
  guildCount: number
  startTime: number
}

// Path to the stats file
const STATS_FILE = path.join(process.cwd(), "bot-stats.json")

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
    if (fs.existsSync(STATS_FILE)) {
      const data = fs.readFileSync(STATS_FILE, "utf8")
      stats = JSON.parse(data) as BotStats
      logger.info("Stats loaded from file")
    } else {
      stats = { ...defaultStats }
      logger.info("Stats initialized with default values")
    }
  } catch (error) {
    logger.error("Failed to load stats file:", error)
    stats = { ...defaultStats }
  }
}

/**
 * Saves the current stats to file
 */
export function saveStats(): void {
  try {
    const data = JSON.stringify(stats, null, 2)
    fs.writeFileSync(STATS_FILE, data, "utf8")
  } catch (error) {
    logger.error("Failed to save stats file:", error)
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