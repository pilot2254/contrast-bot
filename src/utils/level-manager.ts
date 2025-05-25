import { getDb } from "./database"
import { logger } from "./logger"

// XP configuration
export const XP_CONFIG = {
  // Base XP for different actions
  COMMAND_XP: 5,
  REPUTATION_GIVEN_XP: 15,
  REPUTATION_RECEIVED_XP: 10,
  FEEDBACK_XP: 25,
  GAME_PLAYED_XP: 8,
  GAME_WON_XP: 15,
  BET_XP_MULTIPLIER: 0.01, // 1 XP per 100 coins bet
  DAILY_STREAK_XP: 5, // Per day of streak

  // Level calculation
  BASE_XP: 100, // XP needed for level 1
  XP_MULTIPLIER: 1.5, // How much more XP is needed for each level

  // Cooldowns (to prevent farming)
  COMMAND_COOLDOWN_MS: 60000, // 1 minute cooldown between earning XP from commands
}

// User level data type
export interface UserLevel {
  userId: string
  username: string
  xp: number
  level: number
  lastCommandXp: number // Timestamp of last command XP
  totalCommandsUsed: number
  totalGamesPlayed: number
  totalGamesWon: number
  totalBetAmount: number
  updatedAt: number
}

/**
 * Gets or creates a user's level data
 */
export async function getUserLevel(userId: string, username: string): Promise<UserLevel> {
  try {
    const db = getDb()
    const now = Date.now()

    // Try to get existing user
    let user = await db.get("SELECT * FROM user_levels WHERE user_id = ?", userId)

    if (!user) {
      // Create new user if not exists
      await db.run(
        `INSERT INTO user_levels 
         (user_id, username, xp, level, last_command_xp, total_commands_used, total_games_played, total_games_won, total_bet_amount, updated_at) 
         VALUES (?, ?, 0, 0, 0, 0, 0, 0, 0, ?)`,
        userId,
        username,
        now,
      )

      user = {
        user_id: userId,
        username: username,
        xp: 0,
        level: 0,
        last_command_xp: 0,
        total_commands_used: 0,
        total_games_played: 0,
        total_games_won: 0,
        total_bet_amount: 0,
        updated_at: now,
      }
    }

    // Update username if changed
    if (user.username !== username) {
      await db.run("UPDATE user_levels SET username = ? WHERE user_id = ?", username, userId)
      user.username = username
    }

    return {
      userId: user.user_id,
      username: user.username,
      xp: user.xp,
      level: user.level,
      lastCommandXp: user.last_command_xp,
      totalCommandsUsed: user.total_commands_used,
      totalGamesPlayed: user.total_games_played,
      totalGamesWon: user.total_games_won,
      totalBetAmount: user.total_bet_amount,
      updatedAt: user.updated_at,
    }
  } catch (error) {
    logger.error(`Failed to get user level for ${userId}:`, error)
    throw error
  }
}

/**
 * Calculates the XP needed for a specific level
 */
export function calculateXpForLevel(level: number): number {
  return Math.floor(XP_CONFIG.BASE_XP * Math.pow(XP_CONFIG.XP_MULTIPLIER, level - 1))
}

/**
 * Calculates the total XP needed to reach a specific level
 */
export function calculateTotalXpForLevel(level: number): number {
  let totalXp = 0
  for (let i = 1; i <= level; i++) {
    totalXp += calculateXpForLevel(i)
  }
  return totalXp
}

/**
 * Calculates the level for a given amount of XP
 */
export function calculateLevelFromXp(xp: number): number {
  let level = 0
  let xpForNextLevel = XP_CONFIG.BASE_XP
  let totalXpNeeded = 0

  while (xp >= totalXpNeeded + xpForNextLevel) {
    level++
    totalXpNeeded += xpForNextLevel
    xpForNextLevel = calculateXpForLevel(level + 1)
  }

  return level
}

/**
 * Adds XP to a user and handles level ups
 * Returns the updated user level data and whether they leveled up
 */
export async function addXp(
  userId: string,
  username: string,
  xpAmount: number,
): Promise<{ userLevel: UserLevel; leveledUp: boolean; oldLevel?: number }> {
  try {
    const db = getDb()
    const now = Date.now()

    // Start transaction
    await db.exec("BEGIN TRANSACTION")

    try {
      // Get current user level
      const userLevel = await getUserLevel(userId, username)
      const oldLevel = userLevel.level

      // Add XP
      const newXp = userLevel.xp + xpAmount

      // Calculate new level
      const newLevel = calculateLevelFromXp(newXp)
      const leveledUp = newLevel > oldLevel

      // Update user level in database
      await db.run(
        `UPDATE user_levels 
         SET xp = ?, level = ?, updated_at = ? 
         WHERE user_id = ?`,
        newXp,
        newLevel,
        now,
        userId,
      )

      // Record level up in history if leveled up
      if (leveledUp) {
        await db.run(
          `INSERT INTO level_history 
           (user_id, old_level, new_level, timestamp) 
           VALUES (?, ?, ?, ?)`,
          userId,
          oldLevel,
          newLevel,
          now,
        )
      }

      await db.exec("COMMIT")

      // Return updated user level
      return {
        userLevel: {
          ...userLevel,
          xp: newXp,
          level: newLevel,
          updatedAt: now,
        },
        leveledUp,
        oldLevel: leveledUp ? oldLevel : undefined,
      }
    } catch (error) {
      await db.exec("ROLLBACK")
      throw error
    }
  } catch (error) {
    logger.error(`Failed to add XP for ${userId}:`, error)
    throw error
  }
}

/**
 * Awards XP for using a command
 */
export async function awardCommandXp(
  userId: string,
  username: string,
): Promise<{ xpAwarded: number; leveledUp: boolean }> {
  try {
    const userLevel = await getUserLevel(userId, username)
    const now = Date.now()

    // Check cooldown
    if (now - userLevel.lastCommandXp < XP_CONFIG.COMMAND_COOLDOWN_MS) {
      return { xpAwarded: 0, leveledUp: false }
    }

    const db = getDb()

    // Update command stats
    await db.run(
      `UPDATE user_levels 
       SET last_command_xp = ?, total_commands_used = total_commands_used + 1 
       WHERE user_id = ?`,
      now,
      userId,
    )

    // Award XP
    const result = await addXp(userId, username, XP_CONFIG.COMMAND_XP)

    return { xpAwarded: XP_CONFIG.COMMAND_XP, leveledUp: result.leveledUp }
  } catch (error) {
    logger.error(`Failed to award command XP for ${userId}:`, error)
    return { xpAwarded: 0, leveledUp: false }
  }
}

/**
 * Awards XP for giving reputation
 */
export async function awardReputationGivenXp(
  userId: string,
  username: string,
): Promise<{ xpAwarded: number; leveledUp: boolean }> {
  try {
    const result = await addXp(userId, username, XP_CONFIG.REPUTATION_GIVEN_XP)
    return { xpAwarded: XP_CONFIG.REPUTATION_GIVEN_XP, leveledUp: result.leveledUp }
  } catch (error) {
    logger.error(`Failed to award reputation given XP for ${userId}:`, error)
    return { xpAwarded: 0, leveledUp: false }
  }
}

/**
 * Awards XP for receiving reputation
 */
export async function awardReputationReceivedXp(
  userId: string,
  username: string,
): Promise<{ xpAwarded: number; leveledUp: boolean }> {
  try {
    const result = await addXp(userId, username, XP_CONFIG.REPUTATION_RECEIVED_XP)
    return { xpAwarded: XP_CONFIG.REPUTATION_RECEIVED_XP, leveledUp: result.leveledUp }
  } catch (error) {
    logger.error(`Failed to award reputation received XP for ${userId}:`, error)
    return { xpAwarded: 0, leveledUp: false }
  }
}

/**
 * Awards XP for submitting feedback
 */
export async function awardFeedbackXp(
  userId: string,
  username: string,
): Promise<{ xpAwarded: number; leveledUp: boolean }> {
  try {
    const result = await addXp(userId, username, XP_CONFIG.FEEDBACK_XP)
    return { xpAwarded: XP_CONFIG.FEEDBACK_XP, leveledUp: result.leveledUp }
  } catch (error) {
    logger.error(`Failed to award feedback XP for ${userId}:`, error)
    return { xpAwarded: 0, leveledUp: false }
  }
}

/**
 * Awards XP for playing a game
 */
export async function awardGamePlayedXp(
  userId: string,
  username: string,
  won = false,
): Promise<{ xpAwarded: number; leveledUp: boolean }> {
  try {
    const db = getDb()

    // Update game stats
    await db.run(
      `UPDATE user_levels 
       SET total_games_played = total_games_played + 1
       ${won ? ", total_games_won = total_games_won + 1" : ""}
       WHERE user_id = ?`,
      userId,
    )

    // Calculate XP to award
    const xpAmount = XP_CONFIG.GAME_PLAYED_XP + (won ? XP_CONFIG.GAME_WON_XP : 0)

    // Award XP
    const result = await addXp(userId, username, xpAmount)

    return { xpAwarded: xpAmount, leveledUp: result.leveledUp }
  } catch (error) {
    logger.error(`Failed to award game played XP for ${userId}:`, error)
    return { xpAwarded: 0, leveledUp: false }
  }
}

/**
 * Awards XP for betting in a game
 */
export async function awardBetXp(
  userId: string,
  username: string,
  betAmount: number,
): Promise<{ xpAwarded: number; leveledUp: boolean }> {
  try {
    const db = getDb()

    // Update bet stats
    await db.run(
      `UPDATE user_levels 
       SET total_bet_amount = total_bet_amount + ? 
       WHERE user_id = ?`,
      betAmount,
      userId,
    )

    // Calculate XP to award (1 XP per 100 coins bet)
    const xpAmount = Math.floor(betAmount * XP_CONFIG.BET_XP_MULTIPLIER)

    if (xpAmount <= 0) {
      return { xpAwarded: 0, leveledUp: false }
    }

    // Award XP
    const result = await addXp(userId, username, xpAmount)

    return { xpAwarded: xpAmount, leveledUp: result.leveledUp }
  } catch (error) {
    logger.error(`Failed to award bet XP for ${userId}:`, error)
    return { xpAwarded: 0, leveledUp: false }
  }
}

/**
 * Awards XP for daily streak
 */
export async function awardDailyStreakXp(
  userId: string,
  username: string,
  streakDays: number,
): Promise<{ xpAwarded: number; leveledUp: boolean }> {
  try {
    // Calculate XP to award
    const xpAmount = streakDays * XP_CONFIG.DAILY_STREAK_XP

    // Award XP
    const result = await addXp(userId, username, xpAmount)

    return { xpAwarded: xpAmount, leveledUp: result.leveledUp }
  } catch (error) {
    logger.error(`Failed to award daily streak XP for ${userId}:`, error)
    return { xpAwarded: 0, leveledUp: false }
  }
}

/**
 * Gets the level leaderboard
 */
export async function getLevelLeaderboard(limit = 10): Promise<UserLevel[]> {
  try {
    const db = getDb()

    const users = await db.all(
      `SELECT * FROM user_levels 
       ORDER BY level DESC, xp DESC 
       LIMIT ?`,
      limit,
    )

    return users.map((user: any) => ({
      userId: user.user_id,
      username: user.username,
      xp: user.xp,
      level: user.level,
      lastCommandXp: user.last_command_xp,
      totalCommandsUsed: user.total_commands_used,
      totalGamesPlayed: user.total_games_played,
      totalGamesWon: user.total_games_won,
      totalBetAmount: user.total_bet_amount,
      updatedAt: user.updated_at,
    }))
  } catch (error) {
    logger.error("Failed to get level leaderboard:", error)
    return []
  }
}

/**
 * Gets a user's rank on the leaderboard
 */
export async function getUserRank(userId: string): Promise<number> {
  try {
    const db = getDb()

    const result = await db.get(
      `SELECT COUNT(*) as rank 
       FROM user_levels 
       WHERE (level > (SELECT level FROM user_levels WHERE user_id = ?)) 
       OR (level = (SELECT level FROM user_levels WHERE user_id = ?) 
           AND xp > (SELECT xp FROM user_levels WHERE user_id = ?))`,
      userId,
      userId,
      userId,
    )

    return result ? result.rank + 1 : 0
  } catch (error) {
    logger.error(`Failed to get rank for ${userId}:`, error)
    return 0
  }
}

/**
 * Gets the progress to the next level
 */
export function getLevelProgress(
  xp: number,
  level: number,
): {
  currentLevelXp: number
  nextLevelXp: number
  xpForCurrentLevel: number
  xpForNextLevel: number
  progressPercent: number
  xpNeeded: number
} {
  const totalXpForCurrentLevel = calculateTotalXpForLevel(level)
  const xpForNextLevel = calculateXpForLevel(level + 1)
  const xpForCurrentLevel = xp - totalXpForCurrentLevel
  const progressPercent = Math.min(100, Math.floor((xpForCurrentLevel / xpForNextLevel) * 100))

  return {
    currentLevelXp: xpForCurrentLevel,
    nextLevelXp: xpForNextLevel,
    xpForCurrentLevel,
    xpForNextLevel,
    progressPercent,
    xpNeeded: xpForNextLevel - xpForCurrentLevel,
  }
}