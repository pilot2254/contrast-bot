import type { ExtendedClient } from "../structures/ExtendedClient"
import { config } from "../config/bot.config"
import { EconomyService } from "./EconomyService"

interface UserLevelData {
  level: number
  xp: number
  requiredXP: number
}

interface AddXPResult extends UserLevelData {
  leveledUp: boolean
  newLevel?: number
}

interface LeaderboardUser {
  user_id: string
  level: number
  xp: number
  // Add other fields if fetched, e.g., username, rank
}

export class LevelingService {
  constructor(private client: ExtendedClient) {}

  calculateRequiredXP(level: number): number {
    return Math.floor(config.leveling.baseXP * Math.pow(config.leveling.xpMultiplier, level - 1))
  }

  async getUserLevel(userId: string): Promise<UserLevelData> {
    const user = await this.client.database.getUser(userId)
    let level = user.level
    let xp = user.xp

    if (level < 1) {
      level = 1
      await this.client.database.updateUser(userId, { level: 1 })
    }
    if (xp < 0) {
      xp = 0
      await this.client.database.updateUser(userId, { xp: 0 })
    }

    const requiredXP = this.calculateRequiredXP(level)

    if (xp >= requiredXP && level < config.leveling.maxLevel) {
      let newLevel = level
      const currentTotalXP = xp // Use a different variable name to avoid confusion
      while (newLevel < config.leveling.maxLevel && currentTotalXP >= this.calculateRequiredXP(newLevel)) {
        newLevel++
      }
      if (newLevel > level) {
        // This logic seems to recalculate the level based on total XP,
        // but the addXP logic handles incremental level ups.
        // For getUserLevel, it might be simpler to just return current state
        // and let addXP handle the actual leveling up process.
        // However, if this is intended as a "fix" for potentially inconsistent states:
        await this.client.database.updateUser(userId, { level: newLevel })
        level = newLevel
      }
    }
    return { level, xp, requiredXP: this.calculateRequiredXP(level) }
  }

  async addXP(userId: string, amount: number, source: string): Promise<AddXPResult> {
    if (amount <= 0) {
      // No XP to add or invalid amount
      const currentData = await this.getUserLevel(userId)
      return { ...currentData, leveledUp: false }
    }

    const userBeforeXP = await this.client.database.getUser(userId)
    let currentLevel = userBeforeXP.level
    let currentXP = userBeforeXP.xp + amount
    let leveledUpThisTime = false

    let requiredXPForLevelUp = this.calculateRequiredXP(currentLevel)
    while (currentXP >= requiredXPForLevelUp && currentLevel < config.leveling.maxLevel) {
      currentXP -= requiredXPForLevelUp
      currentLevel++
      leveledUpThisTime = true

      const economyService = new EconomyService(this.client)
      try {
        // This assumes _addBalanceInternal is part of an ongoing transaction or handles its own.
        // If not, this should be wrapped in a transaction with XP update.
        await economyService._addBalanceInternal(
          userId,
          config.leveling.levelUpBonus,
          `Level up bonus (Level ${currentLevel})`,
        )
      } catch (e: unknown) {
        this.client.logger.error(
          `Failed to add level up bonus for user ${userId} (Level ${currentLevel}) during addXP:`,
          e,
        )
        throw e // Re-throw to ensure calling transaction (if any) rolls back.
      }
      requiredXPForLevelUp = this.calculateRequiredXP(currentLevel)
    }

    // Ensure XP doesn't go negative if something unexpected happens
    currentXP = Math.max(0, currentXP)

    await this.client.database.updateUser(userId, { level: currentLevel, xp: currentXP })
    await this.client.database.logTransaction(userId, "xp_gain", amount, `XP from ${source}`)

    return {
      level: currentLevel,
      xp: currentXP,
      requiredXP: this.calculateRequiredXP(currentLevel),
      leveledUp: leveledUpThisTime,
      newLevel: leveledUpThisTime ? currentLevel : undefined,
    }
  }

  async getLevelLeaderboard(limit = 10): Promise<LeaderboardUser[]> {
    // Assuming 'users' table has user_id, level, xp
    return this.client.database.all<LeaderboardUser>(
      "SELECT user_id, level, xp FROM users ORDER BY level DESC, xp DESC LIMIT ?",
      [limit],
    )
  }
}
