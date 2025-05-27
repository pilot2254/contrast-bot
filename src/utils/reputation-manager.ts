import { logger } from "./logger"
import { getDb } from "./database"
import { awardReputationGivenXp, awardReputationReceivedXp } from "./level-manager"

export interface UserReputation {
  userId: string
  username: string
  receivedPositive: number
  receivedNegative: number
  givenPositive: number
  givenNegative: number
}

export async function initReputationManager(): Promise<void> {
  logger.info("Reputation manager initialized")
}

export async function canGiveReputation(
  giverId: string,
  receiverId: string,
): Promise<{ canGive: boolean; message: string }> {
  try {
    // Users can't give reputation to themselves
    if (giverId === receiverId) {
      return { canGive: false, message: "You can't give reputation to yourself." }
    }

    const db = getDb()

    // Check if already given
    const existingRep = await db.get(
      "SELECT 1 FROM reputation_given WHERE giver_id = ? AND receiver_id = ?",
      giverId,
      receiverId,
    )

    if (existingRep) {
      return {
        canGive: false,
        message: "You have already given reputation to this user.",
      }
    }

    return { canGive: true, message: "" }
  } catch (error) {
    logger.error(`Failed to check if ${giverId} can give reputation to ${receiverId}:`, error)
    return { canGive: false, message: "An error occurred while checking reputation permissions." }
  }
}

export async function givePositiveRep(
  giverId: string,
  giverUsername: string,
  receiverId: string,
  receiverUsername: string,
): Promise<{ success: boolean; message: string }> {
  try {
    const canGive = await canGiveReputation(giverId, receiverId)
    if (!canGive.canGive) {
      return { success: false, message: canGive.message }
    }

    const db = getDb()
    const now = Date.now()

    // Start a transaction
    await db.exec("BEGIN TRANSACTION")

    try {
      // Update giver's record
      await db.run(
        `INSERT INTO reputation (user_id, username, given_positive, updated_at) 
         VALUES (?, ?, 1, ?)
         ON CONFLICT(user_id) DO UPDATE SET 
         username = ?,
         given_positive = given_positive + 1,
         updated_at = ?`,
        giverId,
        giverUsername,
        now,
        giverUsername,
        now,
      )

      // Update receiver's record
      await db.run(
        `INSERT INTO reputation (user_id, username, received_positive, updated_at) 
         VALUES (?, ?, 1, ?)
         ON CONFLICT(user_id) DO UPDATE SET 
         username = ?,
         received_positive = received_positive + 1,
         updated_at = ?`,
        receiverId,
        receiverUsername,
        now,
        receiverUsername,
        now,
      )

      // Record the reputation
      await db.run(
        "INSERT INTO reputation_given (giver_id, receiver_id, is_positive, timestamp) VALUES (?, ?, 1, ?)",
        giverId,
        receiverId,
        now,
      )

      await db.exec("COMMIT")

      // Award XP to the giver
      await awardReputationGivenXp(giverId, giverUsername)

      // Award XP to the receiver
      await awardReputationReceivedXp(receiverId, receiverUsername)

      return {
        success: true,
        message: `You gave positive reputation to ${receiverUsername}!`,
      }
    } catch (error) {
      await db.exec("ROLLBACK")
      throw error
    }
  } catch (error) {
    logger.error(`Failed to give positive reputation from ${giverId} to ${receiverId}:`, error)
    return { success: false, message: "An error occurred while giving reputation." }
  }
}

/**
 * Gives negative reputation to a user
 * @param giverId The ID of the user giving reputation
 * @param giverName The username of the user giving reputation
 * @param receiverId The ID of the user receiving reputation
 * @param receiverName The username of the user receiving reputation
 * @returns Object indicating success and a message
 */
export async function giveNegativeRep(
  giverId: string,
  giverName: string,
  receiverId: string,
  receiverName: string,
): Promise<{ success: boolean; message: string }> {
  try {
    const canGive = await canGiveReputation(giverId, receiverId)

    if (!canGive.canGive) {
      return { success: false, message: canGive.message }
    }

    const db = getDb()
    const now = Date.now()

    // Start a transaction
    await db.exec("BEGIN TRANSACTION")

    try {
      // Update or insert giver's record
      await db.run(
        `INSERT INTO reputation (user_id, username, given_negative, updated_at) 
         VALUES (?, ?, 1, ?)
         ON CONFLICT(user_id) DO UPDATE SET 
         username = ?,
         given_negative = given_negative + 1,
         updated_at = ?`,
        giverId,
        giverName,
        now,
        giverName,
        now,
      )

      // Update or insert receiver's record
      await db.run(
        `INSERT INTO reputation (user_id, username, received_negative, updated_at) 
         VALUES (?, ?, 1, ?)
         ON CONFLICT(user_id) DO UPDATE SET 
         username = ?,
         received_negative = received_negative + 1,
         updated_at = ?`,
        receiverId,
        receiverName,
        now,
        receiverName,
        now,
      )

      // Record that the giver has given reputation to this receiver
      await db.run(
        "INSERT INTO reputation_given (giver_id, receiver_id, is_positive, timestamp) VALUES (?, ?, 0, ?)",
        giverId,
        receiverId,
        now,
      )

      // Commit the transaction
      await db.exec("COMMIT")

      // Get the updated receiver's reputation for the message
      const receiverRep = await db.get("SELECT received_negative FROM reputation WHERE user_id = ?", receiverId)

      return {
        success: true,
        message: `You gave negative reputation to ${receiverName}. They now have ${receiverRep?.received_negative || 1} negative reputation.`,
      }
    } catch (error) {
      // Rollback on error
      await db.exec("ROLLBACK")
      throw error
    }
  } catch (error) {
    logger.error(`Failed to give negative reputation from ${giverId} to ${receiverId}:`, error)
    return { success: false, message: "An error occurred while giving reputation." }
  }
}

export async function getUserReputation(userId: string): Promise<UserReputation | undefined> {
  try {
    const db = getDb()
    const user = await db.get(
      `SELECT user_id, username, received_positive, received_negative, 
       given_positive, given_negative FROM reputation WHERE user_id = ?`,
      userId,
    )

    if (!user) {
      return undefined
    }

    return {
      userId: user.user_id,
      username: user.username,
      receivedPositive: user.received_positive,
      receivedNegative: user.received_negative,
      givenPositive: user.given_positive,
      givenNegative: user.given_negative,
    }
  } catch (error) {
    logger.error(`Failed to get reputation for user ${userId}:`, error)
    return undefined
  }
}

export async function getTopUsers(sortBy = "receivedTotal", limit = 10): Promise<UserReputation[]> {
  try {
    const db = getDb()

    let orderBy: string
    switch (sortBy.toLowerCase()) {
      case "receivedpositive":
        orderBy = "received_positive DESC"
        break
      case "receivednegative":
        orderBy = "received_negative DESC"
        break
      case "givenpositive":
        orderBy = "given_positive DESC"
        break
      case "givennegative":
        orderBy = "given_negative DESC"
        break
      case "giventotal":
        orderBy = "(given_positive - given_negative) DESC"
        break
      case "receivedtotal":
      default:
        orderBy = "(received_positive - received_negative) DESC"
        break
    }

    const users = await db.all(
      `SELECT user_id, username, received_positive, received_negative, 
       given_positive, given_negative FROM reputation 
       WHERE (received_positive > 0 OR received_negative > 0 OR given_positive > 0 OR given_negative > 0)
       ORDER BY ${orderBy} LIMIT ?`,
      limit,
    )

    return users.map((user: any) => ({
      userId: user.user_id,
      username: user.username,
      receivedPositive: user.received_positive,
      receivedNegative: user.received_negative,
      givenPositive: user.given_positive,
      givenNegative: user.given_negative,
    }))
  } catch (error) {
    logger.error(`Failed to get top users by ${sortBy}:`, error)
    return []
  }
}
