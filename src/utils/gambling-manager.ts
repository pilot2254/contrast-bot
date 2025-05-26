import { logger } from "./logger"
import { getDb } from "./database"
import { getOrCreateUserEconomy, removeCurrency, addCurrency, TRANSACTION_TYPES } from "./economy-manager"
import { awardBetXp } from "./level-manager"

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
  DICE_ROLL: "dice_roll",
  RUSSIAN_ROULETTE: "russian_roulette",
  SLOTS: "slots",
} as const

export async function initGamblingManager(): Promise<void> {
  try {
    logger.info("Gambling manager initialized")
  } catch (error) {
    logger.error("Failed to initialize gambling manager:", error)
  }
}

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

    // Award XP for placing a bet
    await awardBetXp(userId, username, amount)

    return { success: true, message: "Bet placed successfully" }
  } catch (error) {
    logger.error(`Failed to place bet for ${userId}:`, error)
    return { success: false, message: "An error occurred while placing the bet" }
  }
}

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
      `${gameType} win - ${winAmount.toLocaleString()} coins`,
    )

    if (!success) {
      return { success: false, message: "Failed to process winnings" }
    }

    // Update gambling stats
    await updateGamblingStats(userId, 0, winAmount, winAmount - betAmount)
    return { success: true, message: "Winnings processed successfully" }
  } catch (error) {
    logger.error(`Failed to process win for ${userId}:`, error)
    return { success: false, message: "An error occurred while processing winnings" }
  }
}

export async function updateGamblingStats(
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

export async function getGamblingStats(userId: string): Promise<GamblingStats | null> {
  try {
    const db = getDb()
    const stats = await db.get("SELECT * FROM gambling_stats WHERE user_id = ?", userId)

    if (!stats) return null

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

export async function getGamblingLeaderboard(type: "profit" | "won" | "bet" = "profit", limit = 10) {
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
