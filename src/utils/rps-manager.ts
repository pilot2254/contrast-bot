import { logger } from "./logger"
import path from "path"
import fs from "fs"

// Define the RPS player stats structure
export interface RPSPlayerStats {
  userId: string
  username: string
  wins: number
  losses: number
  ties: number
  totalGames: number
  lastUpdated: number
}

// Define the possible choices
export type RPSChoice = "rock" | "paper" | "scissors"

// Define the result of a game
export type RPSResult = "win" | "loss" | "tie"

// Path to the data directory
const DATA_DIR = path.join(process.cwd(), "data")

// Filename for RPS data
const RPS_FILENAME = path.join(DATA_DIR, "rps-stats.json")

// RPS data
let rpsData: RPSPlayerStats[] = []

/**
 * Ensures the data directory exists
 */
function ensureDataDirectory(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true })
      logger.info(`Created data directory at ${DATA_DIR}`)
    }
  } catch (error) {
    logger.error("Failed to create data directory:", error)
    throw error
  }
}

/**
 * Loads RPS data from the JSON file
 */
function loadRPSData(): RPSPlayerStats[] {
  try {
    if (fs.existsSync(RPS_FILENAME)) {
      const data = fs.readFileSync(RPS_FILENAME, "utf8")
      return JSON.parse(data) as RPSPlayerStats[]
    } else {
      return []
    }
  } catch (error) {
    logger.error(`Failed to load RPS data from ${RPS_FILENAME}:`, error)
    return []
  }
}

/**
 * Saves RPS data to the JSON file
 */
function saveRPSData(): void {
  try {
    const jsonData = JSON.stringify(rpsData, null, 2)
    fs.writeFileSync(RPS_FILENAME, jsonData, "utf8")
  } catch (error) {
    logger.error(`Failed to save RPS data to ${RPS_FILENAME}:`, error)
  }
}

/**
 * Initializes the RPS manager
 */
export function initRPSManager(): void {
  try {
    // Ensure the data directory exists
    ensureDataDirectory()

    // Load RPS data from file
    rpsData = loadRPSData()
    logger.info(`Loaded RPS data for ${rpsData.length} players`)
  } catch (error) {
    logger.error("Failed to initialize RPS manager:", error)
    rpsData = []
    saveRPSData()
  }
}

/**
 * Gets or creates a player's stats
 * @param userId The player's ID
 * @param username The player's username
 * @returns The player's stats
 */
function getOrCreatePlayerStats(userId: string, username: string): RPSPlayerStats {
  let playerStats = rpsData.find((stats) => stats.userId === userId)

  if (!playerStats) {
    playerStats = {
      userId,
      username,
      wins: 0,
      losses: 0,
      ties: 0,
      totalGames: 0,
      lastUpdated: Date.now(),
    }
    rpsData.push(playerStats)
    saveRPSData()
  }

  // Update username in case it changed
  if (playerStats.username !== username) {
    playerStats.username = username
    playerStats.lastUpdated = Date.now()
    saveRPSData()
  }

  return playerStats
}

/**
 * Gets a random choice for the bot
 * @returns A random RPS choice
 */
export function getBotChoice(): RPSChoice {
  const choices: RPSChoice[] = ["rock", "paper", "scissors"]
  return choices[Math.floor(Math.random() * choices.length)]
}

/**
 * Determines the result of a game
 * @param playerChoice The player's choice
 * @param botChoice The bot's choice
 * @returns The result of the game
 */
export function determineResult(playerChoice: RPSChoice, botChoice: RPSChoice): RPSResult {
  if (playerChoice === botChoice) {
    return "tie"
  }

  if (
    (playerChoice === "rock" && botChoice === "scissors") ||
    (playerChoice === "paper" && botChoice === "rock") ||
    (playerChoice === "scissors" && botChoice === "paper")
  ) {
    return "win"
  }

  return "loss"
}

/**
 * Records the result of a game
 * @param userId The player's ID
 * @param username The player's username
 * @param botId The bot's ID
 * @param botUsername The bot's username
 * @param result The result of the game
 */
export function recordGame(
  userId: string,
  username: string,
  botId: string,
  botUsername: string,
  result: RPSResult,
): void {
  const playerStats = getOrCreatePlayerStats(userId, username)
  const botStats = getOrCreatePlayerStats(botId, botUsername)

  // Update player stats
  playerStats.totalGames++
  botStats.totalGames++

  if (result === "win") {
    playerStats.wins++
    botStats.losses++
  } else if (result === "loss") {
    playerStats.losses++
    botStats.wins++
  } else {
    playerStats.ties++
    botStats.ties++
  }

  playerStats.lastUpdated = Date.now()
  botStats.lastUpdated = Date.now()

  saveRPSData()
}

/**
 * Gets a player's stats
 * @param userId The player's ID
 * @returns The player's stats or undefined if not found
 */
export function getPlayerStats(userId: string): RPSPlayerStats | undefined {
  return rpsData.find((stats) => stats.userId === userId)
}

// Update the getTopPlayers function to accept a sort parameter
/**
 * Gets the top players by specified criteria
 * @param sortBy The criteria to sort by: "winrate", "wins", "losses", or "ties"
 * @param limit The maximum number of players to return
 * @returns Array of top players
 */
export function getTopPlayers(sortBy = "winrate", limit = 10): RPSPlayerStats[] {
  // Filter out players with no games
  const activePlayers = rpsData.filter((stats) => stats.totalGames > 0)

  // Sort by the specified criteria
  return activePlayers
    .sort((a, b) => {
      switch (sortBy.toLowerCase()) {
        case "wins":
          return b.wins - a.wins
        case "losses":
          return b.losses - a.losses
        case "ties":
          return b.ties - a.ties
        case "winrate":
        default:
          const aWinRate = a.wins / a.totalGames
          const bWinRate = b.wins / b.totalGames
          return bWinRate - aWinRate
      }
    })
    .slice(0, limit)
}

// Initialize RPS manager when the module is imported
initRPSManager()
