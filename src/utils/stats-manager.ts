import fs from "fs"
import path from "path"
import { logger } from "./logger"

// Define the stats structure
interface BotStats {
  commandsUsed: Record<string, number>
  totalCommands: number
  guildCount: number
  lastReset: string
  uptime: {
    start: number
    total: number
  }
}

// Path to the stats file
const STATS_FILE = path.join(process.cwd(), "bot-stats.json")

// Default stats
const defaultStats: BotStats = {
  commandsUsed: {},
  totalCommands: 0,
  guildCount: 0,
  lastReset: new Date().toISOString(),
  uptime: {
    start: Date.now(),
    total: 0,
  },
}

// Load stats from file
export function loadStats(): BotStats {
  try {
    if (fs.existsSync(STATS_FILE)) {
      const data = fs.readFileSync(STATS_FILE, "utf8")
      const stats = JSON.parse(data) as BotStats

      // Update start time on load
      stats.uptime.start = Date.now()

      return stats
    }
  } catch (error) {
    logger.error("Failed to load stats file:", error)
  }

  // Return default stats if file doesn't exist or there was an error
  return { ...defaultStats }
}

// Save stats to file
export function saveStats(stats: BotStats): void {
  try {
    const data = JSON.stringify(stats, null, 2)
    fs.writeFileSync(STATS_FILE, data, "utf8")
  } catch (error) {
    logger.error("Failed to save stats file:", error)
  }
}

// Initialize stats
let stats = loadStats()

// Update guild count
export function updateGuildCount(count: number): void {
  stats.guildCount = count
  saveStats(stats)
}

// Track command usage
export function trackCommand(commandName: string): void {
  if (!stats.commandsUsed[commandName]) {
    stats.commandsUsed[commandName] = 0
  }

  stats.commandsUsed[commandName]++
  stats.totalCommands++

  saveStats(stats)
}

// Get current stats
export function getStats(): BotStats {
  // Calculate current uptime
  const currentUptime = Date.now() - stats.uptime.start
  stats.uptime.total += currentUptime

  // Update start time
  stats.uptime.start = Date.now()

  return stats
}

// Reset stats
export function resetStats(): BotStats {
  stats = { ...defaultStats }
  stats.lastReset = new Date().toISOString()
  saveStats(stats)
  return stats
}
