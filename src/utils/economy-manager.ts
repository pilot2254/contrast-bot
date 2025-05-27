import { logger } from "./logger"
import { getDb } from "./database"
import { awardDailyStreakXp } from "./level-manager"

// Define interfaces
export interface UserEconomy {
  userId: string
  username: string
  balance: number
  totalEarned: number
  totalSpent: number
  lastDaily: number
  dailyStreak: number
  lastMonthly: number
  monthlyStreak: number
  lastYearly: number
  yearlyStreak: number
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

// Transaction types
export const TRANSACTION_TYPES = {
  DAILY: "daily",
  MONTHLY: "monthly",
  YEARLY: "yearly",
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

export async function initEconomyManager(): Promise<void> {
  try {
    logger.info("Economy manager initialized")
  } catch (error) {
    logger.error("Failed to initialize economy manager:", error)
  }
}

export async function getOrCreateUserEconomy(userId: string, username: string): Promise<UserEconomy> {
  try {
    const db = getDb()
    let user = await db.get("SELECT * FROM user_economy WHERE user_id = ?", userId)

    if (!user) {
      // Create new user
      const now = Date.now()
      await db.run(
        `INSERT INTO user_economy (
          user_id, username, balance, total_earned, total_spent, 
          last_daily, daily_streak, last_monthly, monthly_streak,
          last_yearly, yearly_streak, created_at, updated_at
        ) VALUES (?, ?, 0, 0, 0, 0, 0, 0, 0, 0, 0, ?, ?)`,
        userId,
        username,
        now,
        now,
      )

      user = await db.get("SELECT * FROM user_economy WHERE user_id = ?", userId)
    } else if (user.username !== username) {
      // Update username if changed
      await db.run(
        "UPDATE user_economy SET username = ?, updated_at = ? WHERE user_id = ?",
        username,
        Date.now(),
        userId,
      )
      user.username = username
    }

    return {
      userId: user.user_id,
      username: user.username,
      balance: user.balance,
      totalEarned: user.total_earned,
      totalSpent: user.total_spent,
      lastDaily: user.last_daily || 0,
      dailyStreak: user.daily_streak || 0,
      lastMonthly: user.last_monthly || 0,
      monthlyStreak: user.monthly_streak || 0,
      lastYearly: user.last_yearly || 0,
      yearlyStreak: user.yearly_streak || 0,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    }
  } catch (error) {
    logger.error(`Failed to get/create user economy for ${userId}:`, error)
    throw error
  }
}

export async function addCurrency(
  userId: string,
  username: string,
  amount: number,
  type: string,
  description: string,
  relatedUserId?: string,
  skipLimits = false, // New parameter to skip limits for special cases
): Promise<boolean> {
  try {
    // Validate amount (skip limits for admin actions or special cases)
    if (amount <= 0) {
      logger.warn(`Attempted to add non-positive amount: ${amount}`)
      return false
    }

    // Increase the limit for gambling wins and special cases
    if (!skipLimits && amount > 100000000) {
      // Increased from 10000000 to 100000000
      logger.warn(`Attempted to add excessive amount: ${amount}`)
      return false
    }

    const db = getDb()
    const now = Date.now()

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

export async function getEconomyLeaderboard(type: "balance" | "earned" | "spent" = "balance", limit = 10) {
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

export async function handleDailyReward(userId: string, username: string): Promise<void> {
  try {
    const db = getDb()
    const now = Date.now()
    const user = await getOrCreateUserEconomy(userId, username)

    let newStreak = 1

    if (user.lastDaily && now - user.lastDaily < 24 * 60 * 60 * 1000) {
      newStreak = user.dailyStreak + 1
    }

    await db.run(
      `UPDATE user_economy 
       SET balance = balance + ?, daily_streak = ?, last_daily = ?, updated_at = ?
       WHERE user_id = ?`,
      100, // Example reward amount
      newStreak,
      now,
      now,
      userId,
    )

    // Award XP for daily streak
    await awardDailyStreakXp(userId, username, newStreak)
  } catch (error) {
    logger.error(`Failed to handle daily reward for ${userId}:`, error)
  }
}

export async function handleMonthlyReward(
  userId: string,
  username: string,
): Promise<{ reward: number; streak: number; multiplier: number }> {
  try {
    const db = getDb()
    const now = Date.now()
    const user = await getOrCreateUserEconomy(userId, username)

    const MONTHLY_COOLDOWN = 30 * 24 * 60 * 60 * 1000 // 30 days
    let newStreak = 1

    // Check if continuing streak (within 32 days to allow some flexibility)
    if (user.lastMonthly && now - user.lastMonthly < 32 * 24 * 60 * 60 * 1000) {
      newStreak = user.monthlyStreak + 1
    }

    // Calculate multiplier based on streak
    const multiplier = Math.min(1 + (newStreak - 1) * 0.1, 3) // 10% increase per streak, max 3x
    const baseReward = 500
    const reward = Math.floor(baseReward * multiplier)

    await db.run(
      `UPDATE user_economy 
       SET monthly_streak = ?, last_monthly = ?, updated_at = ?
       WHERE user_id = ?`,
      newStreak,
      now,
      now,
      userId,
    )

    // Add the reward
    await addCurrency(
      userId,
      username,
      reward,
      TRANSACTION_TYPES.MONTHLY,
      `Monthly reward (${newStreak}x streak, ${multiplier.toFixed(1)}x multiplier)`,
    )

    return { reward, streak: newStreak, multiplier }
  } catch (error) {
    logger.error(`Failed to handle monthly reward for ${userId}:`, error)
    throw error
  }
}

export async function handleYearlyReward(
  userId: string,
  username: string,
): Promise<{ reward: number; streak: number; multiplier: number }> {
  try {
    const db = getDb()
    const now = Date.now()
    const user = await getOrCreateUserEconomy(userId, username)

    const YEARLY_COOLDOWN = 365 * 24 * 60 * 60 * 1000 // 365 days
    let newStreak = 1

    // Check if continuing streak (within 370 days to allow some flexibility)
    if (user.lastYearly && now - user.lastYearly < 370 * 24 * 60 * 60 * 1000) {
      newStreak = user.yearlyStreak + 1
    }

    // Calculate multiplier based on streak
    const multiplier = Math.min(1 + (newStreak - 1) * 0.2, 5) // 20% increase per streak, max 5x
    const baseReward = 1000
    const reward = Math.floor(baseReward * multiplier)

    await db.run(
      `UPDATE user_economy 
       SET yearly_streak = ?, last_yearly = ?, updated_at = ?
       WHERE user_id = ?`,
      newStreak,
      now,
      now,
      userId,
    )

    // Add the reward
    await addCurrency(
      userId,
      username,
      reward,
      TRANSACTION_TYPES.YEARLY,
      `Yearly reward (${newStreak}x streak, ${multiplier.toFixed(1)}x multiplier)`,
    )

    return { reward, streak: newStreak, multiplier }
  } catch (error) {
    logger.error(`Failed to handle yearly reward for ${userId}:`, error)
    throw error
  }
}
