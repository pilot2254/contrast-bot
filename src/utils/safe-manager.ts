import { logger } from "./logger"
import { getDb } from "./database"
import { getOrCreateUserEconomy } from "./economy-manager"

export interface UserSafe {
  userId: string
  username: string
  balance: number
  capacity: number
  createdAt: number
  updatedAt: number
}

export async function initSafeManager(): Promise<void> {
  try {
    logger.info("Safe manager initialized")
  } catch (error) {
    logger.error("Failed to initialize safe manager:", error)
  }
}

export async function getOrCreateUserSafe(userId: string, username: string): Promise<UserSafe> {
  try {
    const db = getDb()
    let safe = await db.get("SELECT * FROM user_safes WHERE user_id = ?", userId)

    if (!safe) {
      const now = Date.now()
      await db.run(
        `INSERT INTO user_safes (user_id, username, balance, capacity, created_at, updated_at)
         VALUES (?, ?, 0, 10000, ?, ?)`,
        userId,
        username,
        now,
        now,
      )

      safe = await db.get("SELECT * FROM user_safes WHERE user_id = ?", userId)
    } else if (safe.username !== username) {
      await db.run("UPDATE user_safes SET username = ?, updated_at = ? WHERE user_id = ?", username, Date.now(), userId)
      safe.username = username
    }

    return {
      userId: safe.user_id,
      username: safe.username,
      balance: safe.balance,
      capacity: safe.capacity,
      createdAt: safe.created_at,
      updatedAt: safe.updated_at,
    }
  } catch (error) {
    logger.error(`Failed to get/create user safe for ${userId}:`, error)
    throw error
  }
}

export async function depositToSafe(
  userId: string,
  username: string,
  amount: number,
): Promise<{ success: boolean; message: string }> {
  try {
    if (amount <= 0) {
      return { success: false, message: "Deposit amount must be positive" }
    }

    const db = getDb()
    const now = Date.now()

    await db.exec("BEGIN TRANSACTION")

    try {
      const economy = await getOrCreateUserEconomy(userId, username)
      const safe = await getOrCreateUserSafe(userId, username)

      if (economy.balance < amount) {
        await db.exec("ROLLBACK")
        return { success: false, message: "Insufficient funds in your wallet" }
      }

      if (safe.balance + amount > safe.capacity) {
        await db.exec("ROLLBACK")
        return {
          success: false,
          message: `Not enough safe capacity. Available space: ${(safe.capacity - safe.balance).toLocaleString()} coins`,
        }
      }

      // Remove from wallet (manual transaction handling)
      await db.run(
        `UPDATE user_economy 
         SET balance = balance - ?, total_spent = total_spent + ?, updated_at = ?
         WHERE user_id = ?`,
        amount,
        amount,
        now,
        userId,
      )

      // Create transaction record for wallet withdrawal
      await db.run(
        `INSERT INTO transactions (user_id, type, amount, description, timestamp, related_user_id)
         VALUES (?, ?, ?, ?, ?, ?)`,
        userId,
        "transfer_sent",
        -amount,
        "Deposit to safe",
        now,
        null,
      )

      // Add to safe
      await db.run(
        `UPDATE user_safes 
         SET balance = balance + ?, updated_at = ?
         WHERE user_id = ?`,
        amount,
        now,
        userId,
      )

      await db.exec("COMMIT")
      return {
        success: true,
        message: `Successfully deposited ${amount.toLocaleString()} coins to your safe`,
      }
    } catch (error) {
      await db.exec("ROLLBACK")
      throw error
    }
  } catch (error) {
    logger.error(`Failed to deposit to safe for ${userId}:`, error)
    return { success: false, message: "An error occurred during deposit" }
  }
}

export async function withdrawFromSafe(
  userId: string,
  username: string,
  amount: number,
): Promise<{ success: boolean; message: string }> {
  try {
    if (amount <= 0) {
      return { success: false, message: "Withdrawal amount must be positive" }
    }

    const db = getDb()
    const now = Date.now()

    await db.exec("BEGIN TRANSACTION")

    try {
      const safe = await getOrCreateUserSafe(userId, username)

      if (safe.balance < amount) {
        await db.exec("ROLLBACK")
        return { success: false, message: "Insufficient funds in your safe" }
      }

      // Remove from safe
      await db.run(
        `UPDATE user_safes 
         SET balance = balance - ?, updated_at = ?
         WHERE user_id = ?`,
        amount,
        now,
        userId,
      )

      // Add to wallet (manual transaction handling)
      await db.run(
        `UPDATE user_economy 
         SET balance = balance + ?, total_earned = total_earned + ?, updated_at = ?
         WHERE user_id = ?`,
        amount,
        amount,
        now,
        userId,
      )

      // Create transaction record for wallet deposit
      await db.run(
        `INSERT INTO transactions (user_id, type, amount, description, timestamp, related_user_id)
         VALUES (?, ?, ?, ?, ?, ?)`,
        userId,
        "transfer_received",
        amount,
        "Withdrawal from safe",
        now,
        null,
      )

      await db.exec("COMMIT")
      return {
        success: true,
        message: `Successfully withdrew ${amount.toLocaleString()} coins from your safe`,
      }
    } catch (error) {
      await db.exec("ROLLBACK")
      throw error
    }
  } catch (error) {
    logger.error(`Failed to withdraw from safe for ${userId}:`, error)
    return { success: false, message: "An error occurred during withdrawal" }
  }
}

export async function upgradeSafeCapacity(
  userId: string,
  username: string,
  additionalCapacity: number,
): Promise<{ success: boolean; message: string }> {
  try {
    const db = getDb()
    const now = Date.now()

    await db.run(
      `UPDATE user_safes 
       SET capacity = capacity + ?, updated_at = ?
       WHERE user_id = ?`,
      additionalCapacity,
      now,
      userId,
    )

    return {
      success: true,
      message: `Safe capacity increased by ${additionalCapacity.toLocaleString()} coins`,
    }
  } catch (error) {
    logger.error(`Failed to upgrade safe capacity for ${userId}:`, error)
    return { success: false, message: "An error occurred during upgrade" }
  }
}
