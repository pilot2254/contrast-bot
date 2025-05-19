import { logger } from "./logger"
import { getDb } from "./database"

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

/**
 * Initializes the RPS manager
 */
export async function initRPSManager(): Promise<void> {
  try {
    logger.info("RPS manager initialized")
  } catch (error) {
    logger.error("Failed to initialize RPS manager:", error)
  }
}

/**
 * Gets or creates a player's stats
 * @param userId The player's ID
 * @param username The player's username
 * @returns The player's stats
 */
async function getOrCreatePlayerStats(userId: string, username: string): Promise<RPSPlayerStats> {
  try {
    const db = getDb()
    const now = Date.now()

    // Try to get existing stats
    let playerStats = await db.get(
      "SELECT user_id, username, wins, losses, ties, total_games, last_updated FROM rps_stats WHERE user_id = ?",
      userId,
    )

    if (!playerStats) {
      // Create new stats
      await db.run(
        `INSERT INTO rps_stats (user_id, username, wins, losses, ties, total_games, last_updated)
         VALUES (?, ?, 0, 0, 0, 0, ?)`,
        userId,
        username,
        now,
      )

      playerStats = {
        user_id: userId,
        username,
        wins: 0,
        losses: 0,
        ties: 0,
        total_games: 0,
        last_updated: now,
      }
    } else if (playerStats.username !== username) {
      // Update username if changed
      await db.run("UPDATE rps_stats SET username = ?, last_updated = ? WHERE user_id = ?", username, now, userId)

      playerStats.username = username
      playerStats.last_updated = now
    }

    return {
      userId: playerStats.user_id,
      username: playerStats.username,
      wins: playerStats.wins,
      losses: playerStats.losses,
      ties: playerStats.ties,
      totalGames: playerStats.total_games,
      lastUpdated: playerStats.last_updated,
    }
  } catch (error) {
    logger.error(`Failed to get or create RPS stats for ${userId}:`, error)
    throw error
  }
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
export async function recordGame(
  userId: string,
  username: string,
  botId: string,
  botUsername: string,
  result: RPSResult,
): Promise<void> {
  try {
    const db = getDb()
    const now = Date.now()

    // Start a transaction
    await db.exec("BEGIN TRANSACTION")

    try {
      // Update player stats
      await db.run(
        `INSERT INTO rps_stats (user_id, username, wins, losses, ties, total_games, last_updated)
         VALUES (?, ?, ?, ?, ?, 1, ?)
         ON CONFLICT(user_id) DO UPDATE SET
         username = ?,
         wins = wins + ?,
         losses = losses + ?,
         ties = ties + ?,
         total_games = total_games + 1,
         last_updated = ?`,
        userId,
        username,
        result === "win" ? 1 : 0,
        result === "loss" ? 1 : 0,
        result === "tie" ? 1 : 0,
        now,
        username,
        result === "win" ? 1 : 0,
        result === "loss" ? 1 : 0,
        result === "tie" ? 1 : 0,
        now,
      )

      // Update bot stats
      await db.run(
        `INSERT INTO rps_stats (user_id, username, wins, losses, ties, total_games, last_updated)
         VALUES (?, ?, ?, ?, ?, 1, ?)
         ON CONFLICT(user_id) DO UPDATE SET
         username = ?,
         wins = wins + ?,
         losses = losses + ?,
         ties = ties + ?,
         total_games = total_games + 1,
         last_updated = ?`,
        botId,
        botUsername,
        result === "loss" ? 1 : 0,
        result === "win" ? 1 : 0,
        result === "tie" ? 1 : 0,
        now,
        botUsername,
        result === "loss" ? 1 : 0,
        result === "win" ? 1 : 0,
        result === "tie" ? 1 : 0,
        now,
      )

      // Commit the transaction
      await db.exec("COMMIT")

      logger.debug(`Recorded RPS game: ${username} ${result} against ${botUsername}`)
    } catch (error) {
      // Rollback on error
      await db.exec("ROLLBACK")
      throw error
    }
  } catch (error) {
    logger.error(`Failed to record RPS game for ${userId}:`, error)
  }
}

/**
 * Gets a player's stats
 * @param userId The player's ID
 * @returns The player's stats or undefined if not found
 */
export async function getPlayerStats(userId: string): Promise<RPSPlayerStats | undefined> {
  try {
    const db = getDb()
    const stats = await db.get(
      "SELECT user_id, username, wins, losses, ties, total_games, last_updated FROM rps_stats WHERE user_id = ?",
      userId,
    )

    if (!stats) {
      return undefined
    }

    return {
      userId: stats.user_id,
      username: stats.username,
      wins: stats.wins,
      losses: stats.losses,
      ties: stats.ties,
      totalGames: stats.total_games,
      lastUpdated: stats.last_updated,
    }
  } catch (error) {
    logger.error(`Failed to get RPS stats for ${userId}:`, error)
    return undefined
  }
}

/**
 * Gets the top players by specified criteria
 * @param sortBy The criteria to sort by: "winrate", "wins", "losses", or "ties"
 * @param limit The maximum number of players to return
 * @returns Array of top players
 */
export async function getTopPlayers(sortBy = "winrate", limit = 10): Promise<RPSPlayerStats[]> {
  try {
    const db = getDb()

    let orderBy: string
    switch (sortBy.toLowerCase()) {
      case "wins":
        orderBy = "wins DESC"
        break
      case "losses":
        orderBy = "losses DESC"
        break
      case "ties":
        orderBy = "ties DESC"
        break
      case "winrate":
      default:
        orderBy = "CAST(wins AS FLOAT) / CASE WHEN total_games = 0 THEN 1 ELSE total_games END DESC"
        break
    }

    const players = await db.all(
      `SELECT user_id, username, wins, losses, ties, total_games, last_updated 
       FROM rps_stats 
       WHERE total_games > 0
       ORDER BY ${orderBy} LIMIT ?`,
      limit,
    )

    return players.map((player) => ({
      userId: player.user_id,
      username: player.username,
      wins: player.wins,
      losses: player.losses,
      ties: player.ties,
      totalGames: player.total_games,
      lastUpdated: player.last_updated,
    }))
  } catch (error) {
    logger.error(`Failed to get top RPS players by ${sortBy}:`, error)
    return []
  }
}
