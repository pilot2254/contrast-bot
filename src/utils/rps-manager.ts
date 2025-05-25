import { logger } from "./logger"
import { getDb } from "./database"

// Define types
export type RPSChoice = "rock" | "paper" | "scissors"
export type RPSResult = "win" | "loss" | "tie"

export interface PlayerStats {
  userId: string
  username: string
  wins: number
  losses: number
  ties: number
  totalGames: number
  winRate: number
  lastPlayed: number
}

// Get player stats
export async function getPlayerStats(userId: string): Promise<PlayerStats | null> {
  try {
    const db = await getDb()
    const player = await db.get("SELECT * FROM rps_players WHERE userId = ?", [userId])

    if (!player) return null

    // Calculate win rate
    const totalGames = player.wins + player.losses + player.ties
    const winRate = totalGames > 0 ? (player.wins / totalGames) * 100 : 0

    return {
      userId: player.userId,
      username: player.username,
      wins: player.wins,
      losses: player.losses,
      ties: player.ties,
      totalGames,
      winRate,
      lastPlayed: player.lastPlayed,
    }
  } catch (error) {
    logger.error("Error getting player stats:", error)
    return null
  }
}

// Get top players
export async function getTopPlayers(limit = 10): Promise<PlayerStats[]> {
  try {
    const db = await getDb()
    const players = await db.all(
      "SELECT * FROM rps_players WHERE totalGames > 0 ORDER BY winRate DESC, totalGames DESC LIMIT ?",
      [limit],
    )

    return players.map((player) => ({
      userId: player.userId,
      username: player.username,
      wins: player.wins,
      losses: player.losses,
      ties: player.ties,
      totalGames: player.totalGames,
      winRate: player.winRate,
      lastPlayed: player.lastPlayed,
    }))
  } catch (error) {
    logger.error("Error getting top players:", error)
    return []
  }
}

// Record game result
export async function recordGame(userId: string, username: string, result: RPSResult): Promise<boolean> {
  try {
    const db = await getDb()
    const now = Date.now()

    // Update player stats
    await db.run(
      `INSERT INTO rps_players (userId, username, wins, losses, ties, totalGames, winRate, lastPlayed)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(userId) DO UPDATE SET
       username = ?,
       wins = wins + ?,
       losses = losses + ?,
       ties = ties + ?,
       totalGames = totalGames + 1,
       winRate = (wins + ?) * 100.0 / (totalGames + 1),
       lastPlayed = ?`,
      [
        userId,
        username,
        result === "win" ? 1 : 0,
        result === "loss" ? 1 : 0,
        result === "tie" ? 1 : 0,
        1,
        result === "win" ? 100 : 0,
        now,
        username,
        result === "win" ? 1 : 0,
        result === "loss" ? 1 : 0,
        result === "tie" ? 1 : 0,
        result === "win" ? 1 : 0,
        now,
      ],
    )

    // Record game in history
    await db.run("INSERT INTO rps_games (userId, username, result, timestamp) VALUES (?, ?, ?, ?)", [
      userId,
      username,
      result,
      now,
    ])

    return true
  } catch (error) {
    logger.error("Error recording game:", error)
    return false
  }
}

// Get bot choice
export function getBotChoice(): RPSChoice {
  const choices: RPSChoice[] = ["rock", "paper", "scissors"]
  return choices[Math.floor(Math.random() * choices.length)]
}

// Determine game result
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
