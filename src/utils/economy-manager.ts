import { logger } from "./logger"
import { getDb } from "./database"

// Define interfaces
export interface UserEconomy {
  userId: string
  username: string
  balance: number
  totalEarned: number
  totalSpent: number
  lastDaily: number
  dailyStreak: number
  createdAt: number
  updatedAt: number
}

export interface Transaction {
  id: number
  userId: string
  type: string
  amount: number
  description: string
  timestamp: number
  relatedUserId?: string
}

export interface EconomyLeaderboard {
  userId: string
  username: string
  value: number
  rank: number
}

// Transaction types
export const TRANSACTION_TYPES = {
  DAILY: "daily",
  TRANSFER_SENT: "transfer_sent",
  TRANSFER_RECEIVED: "transfer_received",
  SHOP_PURCHASE: "shop_purchase",
  GAMBLING_WIN: "gambling_win",
  GAMBLING_LOSS: "gambling_loss",
  GAMBLING_BET: "gambling_bet",
  ADMIN_ADD: "admin_add",
  ADMIN_REMOVE: "admin_remove",
  BONUS: "bonus",
} as const

/**
 * Initializes the economy manager
 */
export async function initEconomyManager(): Promise<void> {
  try {
    logger.info("Economy manager initialized")
  } catch (error) {
    logger.error("Failed to initialize economy manager:", error)
  }
}

/**
 * Gets or creates a user's economy data
 * @param userId The user's ID
 * @param username The user's username
 * @returns The user's economy data
 */
export async function getOrCreateUserEconomy(userId: string, username: string): Promise<UserEconomy> {
  try {
    const db = getDb()

    // Try to get existing user
    let user = await db.get("SELECT * FROM user_economy WHERE user_id = ?", userId)

    if (!user) {
      // Create new user
      const now = Date.now()
      await db.run(
        `INSERT INTO user_economy (
          user_id, username, balance, total_earned, total_spent, 
          last_daily, daily_streak, created_at, updated_at
        ) VALUES (?, ?, 0, 0, 0, 0, 0, ?, ?)`,
        userId,
        username,
        now,
        now,
      )

      user = await db.get("SELECT * FROM user_economy WHERE user_id = ?", userId)
    } else {
      // Update username if it changed
      if (user.username !== username) {
        await db.run(
          "UPDATE user_economy SET username = ?, updated_at = ? WHERE user_id = ?",
          username,
          Date.now(),
          userId,
        )
        user.username = username
      }
    }

    return {
      userId: user.user_id,
      username: user.username,
      balance: user.balance,
      totalEarned: user.total_earned,
      totalSpent: user.total_spent,
      lastDaily: user.last_daily,
      dailyStreak: user.daily_streak,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    }
  } catch (error) {
    logger.error(`Failed to get/create user economy for ${userId}:`, error)
    throw error
  }
}

/**
 * Adds currency to a user's balance
 * @param userId The user's ID
 * @param username The user's username
 * @param amount The amount to add
 * @param type The transaction type
 * @param description The transaction description
 * @param relatedUserId Optional related user ID
 * @returns Whether the operation was successful
 */
export async function addCurrency(
  userId: string,
  username: string,
  amount: number,
  type: string,
  description: string,
  relatedUserId?: string,
): Promise<boolean> {
  try {
    const db = getDb()
    const now = Date.now()

    // Start transaction
    await db.exec("BEGIN TRANSACTION")

    try {
      // Ensure user exists
      await getOrCreateUserEconomy(userId, username)

      // Update balance and total earned
      await db.run(
        `UPDATE user_economy 
         SET balance = balance + ?, total_earned = total_earned + ?, updated_at = ?
         WHERE user_id = ?`,
        amount,
        amount,
        now,
        userId,
      )

      // Create transaction record
      await db.run(
        `INSERT INTO transactions (user_id, type, amount, description, timestamp, related_user_id)
         VALUES (?, ?, ?, ?, ?, ?)`,
        userId,
        type,
        amount,
        description,
        now,
        relatedUserId,
      )

      await db.exec("COMMIT")
      logger.info(`Added ${amount} currency to ${username} (${userId})`)
      return true
    } catch (error) {
      await db.exec("ROLLBACK")
      throw error
    }
  } catch (error) {
    logger.error(`Failed to add currency to ${userId}:`, error)
    return false
  }
}

/**
 * Removes currency from a user's balance
 * @param userId The user's ID
 * @param username The user's username
 * @param amount The amount to remove
 * @param type The transaction type
 * @param description The transaction description
 * @param relatedUserId Optional related user ID
 * @returns Whether the operation was successful
 */
export async function removeCurrency(
  userId: string,
  username: string,
  amount: number,
  type: string,
  description: string,
  relatedUserId?: string,
): Promise<{ success: boolean; message: string }> {
  try {
    const db = getDb()
    const now = Date.now()

    // Start transaction
    await db.exec("BEGIN TRANSACTION")

    try {
      // Get user's current balance
      const user = await getOrCreateUserEconomy(userId, username)

      if (user.balance < amount) {
        await db.exec("ROLLBACK")
        return { success: false, message: "Insufficient funds" }
      }

      // Update balance and total spent
      await db.run(
        `UPDATE user_economy 
         SET balance = balance - ?, total_spent = total_spent + ?, updated_at = ?
         WHERE user_id = ?`,
        amount,
        amount,
        now,
        userId,
      )

      // Create transaction record
      await db.run(
        `INSERT INTO transactions (user_id, type, amount, description, timestamp, related_user_id)
         VALUES (?, ?, ?, ?, ?, ?)`,
        userId,
        type,
        -amount,
        description,
        now,
        relatedUserId,
      )

      await db.exec("COMMIT")
      logger.info(`Removed ${amount} currency from ${username} (${userId})`)
      return { success: true, message: "Currency removed successfully" }
    } catch (error) {
      await db.exec("ROLLBACK")
      throw error
    }
  } catch (error) {
    logger.error(`Failed to remove currency from ${userId}:`, error)
    return { success: false, message: "An error occurred" }
  }
}

/**
 * Transfers currency between users
 * @param fromUserId The sender's ID
 * @param fromUsername The sender's username
 * @param toUserId The recipient's ID
 * @param toUsername The recipient's username
 * @param amount The amount to transfer
 * @returns Transfer result
 */
export async function transferCurrency(
  fromUserId: string,
  fromUsername: string,
  toUserId: string,
  toUsername: string,
  amount: number,
): Promise<{ success: boolean; message: string }> {
  try {
    if (fromUserId === toUserId) {
      return { success: false, message: "You cannot transfer currency to yourself" }
    }

    if (amount <= 0) {
      return { success: false, message: "Transfer amount must be positive" }
    }

    const db = getDb()
    const now = Date.now()

    // Start transaction
    await db.exec("BEGIN TRANSACTION")

    try {
      // Get sender's balance
      const sender = await getOrCreateUserEconomy(fromUserId, fromUsername)

      if (sender.balance < amount) {
        await db.exec("ROLLBACK")
        return { success: false, message: "Insufficient funds" }
      }

      // Ensure recipient exists
      await getOrCreateUserEconomy(toUserId, toUsername)

      // Remove from sender
      await db.run(
        `UPDATE user_economy 
         SET balance = balance - ?, total_spent = total_spent + ?, updated_at = ?
         WHERE user_id = ?`,
        amount,
        amount,
        now,
        fromUserId,
      )

      // Add to recipient
      await db.run(
        `UPDATE user_economy 
         SET balance = balance + ?, total_earned = total_earned + ?, updated_at = ?
         WHERE user_id = ?`,
        amount,
        amount,
        now,
        toUserId,
      )

      // Create transaction records
      await db.run(
        `INSERT INTO transactions (user_id, type, amount, description, timestamp, related_user_id)
         VALUES (?, ?, ?, ?, ?, ?)`,
        fromUserId,
        TRANSACTION_TYPES.TRANSFER_SENT,
        -amount,
        `Transfer to ${toUsername}`,
        now,
        toUserId,
      )

      await db.run(
        `INSERT INTO transactions (user_id, type, amount, description, timestamp, related_user_id)
         VALUES (?, ?, ?, ?, ?, ?)`,
        toUserId,
        TRANSACTION_TYPES.TRANSFER_RECEIVED,
        amount,
        `Transfer from ${fromUsername}`,
        now,
        fromUserId,
      )

      await db.exec("COMMIT")
      logger.info(`Transferred ${amount} currency from ${fromUsername} to ${toUsername}`)
      return { success: true, message: `Successfully transferred ${amount} coins to ${toUsername}` }
    } catch (error) {
      await db.exec("ROLLBACK")
      throw error
    }
  } catch (error) {
    logger.error(`Failed to transfer currency:`, error)
    return { success: false, message: "An error occurred during transfer" }
  }
}

/**
 * Gets a user's transaction history
 * @param userId The user's ID
 * @param limit The maximum number of transactions to return
 * @returns Array of transactions
 */
export async function getTransactionHistory(userId: string, limit = 10): Promise<Transaction[]> {
  try {
    const db = getDb()
    const transactions = await db.all(
      `SELECT * FROM transactions 
       WHERE user_id = ? 
       ORDER BY timestamp DESC 
       LIMIT ?`,
      userId,
      limit,
    )

    return transactions.map((t: any) => ({
      id: t.id,
      userId: t.user_id,
      type: t.type,
      amount: t.amount,
      description: t.description,
      timestamp: t.timestamp,
      relatedUserId: t.related_user_id,
    }))
  } catch (error) {
    logger.error(`Failed to get transaction history for ${userId}:`, error)
    return []
  }
}

/**
 * Gets economy leaderboard
 * @param type The type of leaderboard (balance, earned, spent)
 * @param limit The maximum number of users to return
 * @returns Array of leaderboard entries
 */
export async function getEconomyLeaderboard(
  type: "balance" | "earned" | "spent" = "balance",
  limit = 10,
): Promise<EconomyLeaderboard[]> {
  try {
    const db = getDb()

    let column: string
    switch (type) {
      case "earned":
        column = "total_earned"
        break
      case "spent":
        column = "total_spent"
        break
      default:
        column = "balance"
    }

    const users = await db.all(
      `SELECT user_id, username, ${column} as value
       FROM user_economy 
       WHERE ${column} > 0
       ORDER BY ${column} DESC 
       LIMIT ?`,
      limit,
    )

    return users.map((user: any, index: number) => ({
      userId: user.user_id,
      username: user.username,
      value: user.value,
      rank: index + 1,
    }))
  } catch (error) {
    logger.error(`Failed to get economy leaderboard:`, error)
    return []
  }
}
