import { logger } from "./logger"
import { getDb } from "./database"
import { getOrCreateUserEconomy, removeCurrency, addCurrency, TRANSACTION_TYPES } from "./economy-manager"

// Define gambling stats interface
export interface GamblingStats {
  userId: string
  totalBet: number
  totalWon: number
  totalLost: number
  gamesPlayed: number
  biggestWin: number
  updatedAt: number
}

// Game types
export const GAME_TYPES = {
  RPS: "rps",
  NUMBER_GUESS: "number_guess",
  COINFLIP: "coinflip",
} as const

/**
 * Initializes the gambling manager
 */
export async function initGamblingManager(): Promise<void> {
  try {
    logger.info("Gambling manager initialized")
  } catch (error) {
    logger.error("Failed to initialize gambling manager:", error)
  }
}

/**
 * Places a bet for a user
 * @param userId The user's ID
 * @param username The user's username
 * @param amount The bet amount
 * @param gameType The type of game
 * @returns Whether the bet was placed successfully
 */
export async function placeBet(
  userId: string,
  username: string,
  amount: number,
  gameType: string,
): Promise<{ success: boolean; message: string }> {
  try {
    // Validate bet amount
    if (amount <= 0) {
      return { success: false, message: "Bet amount must be positive" }
    }

    if (amount > 1000000) {
      return { success: false, message: "Maximum bet is 1,000,000 coins" }
    }

    // Check if user has enough balance
    const economy = await getOrCreateUserEconomy(userId, username)
    if (economy.balance < amount) {
      return { success: false, message: "Insufficient funds" }
    }

    // Remove the bet amount from balance
    const result = await removeCurrency(
      userId,
      username,
      amount,
      TRANSACTION_TYPES.GAMBLING_BET,
      `${gameType} bet placed`,
    )

    if (!result.success) {
      return { success: false, message: result.message }
    }

    // Update gambling stats
    await updateGamblingStats(userId, amount, 0, 0)

    logger.info(`${username} placed a ${amount} coin bet on ${gameType}`)
    return { success: true, message: "Bet placed successfully" }
  } catch (error) {
    logger.error(`Failed to place bet for ${userId}:`, error)
    return { success: false, message: "An error occurred while placing the bet" }
  }
}

/**
 * Processes a gambling win
 * @param userId The user's ID
 * @param username The user's username
 * @param betAmount The original bet amount
 * @param winAmount The amount won
 * @param gameType The type of game
 * @returns Whether the win was processed successfully
 */
export async function processWin(
  userId: string,
  username: string,
  betAmount: number,
  winAmount: number,
  gameType: string,
): Promise<{ success: boolean; message: string }> {
  try {
    // Add winnings to balance
    const success = await addCurrency(
      userId,
      username,
      winAmount,
      TRANSACTION_TYPES.GAMBLING_WIN,
      `${gameType} win - ${winAmount.toLocaleString()} coins (${(winAmount - betAmount).toLocaleString()} profit)`,
    )

    if (!success) {
      return { success: false, message: "Failed to process winnings" }
    }

    // Update gambling stats
    await updateGamblingStats(userId, 0, winAmount, winAmount - betAmount)

    logger.info(`${username} won ${winAmount} coins from ${gameType} (bet: ${betAmount})`)
    return { success: true, message: "Winnings processed successfully" }
  } catch (error) {
    logger.error(`Failed to process win for ${userId}:`, error)
    return { success: false, message: "An error occurred while processing winnings" }
  }
}

/**
 * Updates gambling statistics for a user
 * @param userId The user's ID
 * @param betAmount Amount bet (0 if not betting)
 * @param wonAmount Amount won (0 if lost)
 * @param profit Net profit/loss
 */
async function updateGamblingStats(
  userId: string,
  betAmount: number,
  wonAmount: number,
  profit: number,
): Promise<void> {
  try {
    const db = getDb()
    const now = Date.now()

    // Get current stats
    const currentStats = await db.get("SELECT * FROM gambling_stats WHERE user_id = ?", userId)

    if (!currentStats) {
      // Create new stats record
      const lostAmount = betAmount > wonAmount ? betAmount - wonAmount : 0
      await db.run(
        `INSERT INTO gambling_stats (
          user_id, total_bet, total_won, total_lost, games_played, biggest_win, updated_at
        ) VALUES (?, ?, ?, ?, 1, ?, ?)`,
        userId,
        betAmount,
        wonAmount,
        lostAmount,
        wonAmount,
        now,
      )
    } else {
      // Update existing stats
      const newBiggestWin = Math.max(currentStats.biggest_win, wonAmount)
      const lostThisGame = betAmount > wonAmount ? betAmount - wonAmount : 0
      const newTotalLost = currentStats.total_lost + lostThisGame

      await db.run(
        `UPDATE gambling_stats SET
          total_bet = total_bet + ?,
          total_won = total_won + ?,
          total_lost = ?,
          games_played = games_played + 1,
          biggest_win = ?,
          updated_at = ?
        WHERE user_id = ?`,
        betAmount,
        wonAmount,
        newTotalLost,
        newBiggestWin,
        now,
        userId,
      )
    }
  } catch (error) {
    logger.error(`Failed to update gambling stats for ${userId}:`, error)
  }
}

/**
 * Gets gambling statistics for a user
 * @param userId The user's ID
 * @returns The user's gambling stats or null if not found
 */
export async function getGamblingStats(userId: string): Promise<GamblingStats | null> {
  try {
    const db = getDb()
    const stats = await db.get("SELECT * FROM gambling_stats WHERE user_id = ?", userId)

    if (!stats) {
      return null
    }

    return {
      userId: stats.user_id,
      totalBet: stats.total_bet,
      totalWon: stats.total_won,
      totalLost: stats.total_lost,
      gamesPlayed: stats.games_played,
      biggestWin: stats.biggest_win,
      updatedAt: stats.updated_at,
    }
  } catch (error) {
    logger.error(`Failed to get gambling stats for ${userId}:`, error)
    return null
  }
}

/**
 * Gets gambling leaderboard
 * @param type The type of leaderboard (profit, won, bet)
 * @param limit The maximum number of users to return
 * @returns Array of leaderboard entries
 */
export async function getGamblingLeaderboard(
  type: "profit" | "won" | "bet" = "profit",
  limit = 10,
): Promise<{ userId: string; value: number; rank: number }[]> {
  try {
    const db = getDb()

    let orderBy: string
    let selectValue: string

    switch (type) {
      case "won":
        orderBy = "total_won DESC"
        selectValue = "total_won as value"
        break
      case "bet":
        orderBy = "total_bet DESC"
        selectValue = "total_bet as value"
        break
      default: // profit
        orderBy = "(total_won - total_lost) DESC"
        selectValue = "(total_won - total_lost) as value"
    }

    const users = await db.all(
      `SELECT user_id, ${selectValue}
       FROM gambling_stats 
       WHERE games_played > 0
       ORDER BY ${orderBy}
       LIMIT ?`,
      limit,
    )

    return users.map((user: any, index: number) => ({
      userId: user.user_id,
      value: user.value,
      rank: index + 1,
    }))
  } catch (error) {
    logger.error(`Failed to get gambling leaderboard:`, error)
    return []
  }
}