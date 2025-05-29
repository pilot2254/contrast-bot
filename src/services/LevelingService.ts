import type { ExtendedClient } from "../structures/ExtendedClient"
import { config } from "../config/bot.config"
import { EconomyService } from "./EconomyService"

export class LevelingService {
  constructor(private client: ExtendedClient) {}

  // Calculate XP required for a specific level
  calculateRequiredXP(level: number): number {
    return Math.floor(config.leveling.baseXP * Math.pow(config.leveling.xpMultiplier, level - 1))
  }

  // Get user's level data
  async getUserLevel(userId: string): Promise<{ level: number; xp: number; requiredXP: number }> {
    const user = await this.client.database.getUser(userId)
    let level = user.level
    let xp = user.xp

    // Ensure level is at least 1
    if (level < 1) {
      level = 1
      await this.client.database.updateUser(userId, { level: 1 })
    }

    // Ensure XP is not negative
    if (xp < 0) {
      xp = 0
      await this.client.database.updateUser(userId, { xp: 0 })
    }

    const requiredXP = this.calculateRequiredXP(level)

    // If user has more XP than required for current level, level them up
    if (xp >= requiredXP && level < config.leveling.maxLevel) {
      // Calculate what level they should be at
      let newLevel = level
      const currentXP = xp

      while (currentXP >= this.calculateRequiredXP(newLevel) && newLevel < config.leveling.maxLevel) {
        newLevel++
      }

      // If they should be a higher level, update them
      if (newLevel > level) {
        await this.client.database.updateUser(userId, { level: newLevel })
        level = newLevel
      }
    }

    return {
      level,
      xp,
      requiredXP: this.calculateRequiredXP(level),
    }
  }

  // Add XP to user
  async addXP(
    userId: string,
    amount: number,
    source: string,
  ): Promise<{
    level: number
    xp: number
    requiredXP: number
    leveledUp: boolean
    newLevel?: number // Represents the final new level if leveledUp is true
  }> {
    const userBeforeXP = await this.client.database.getUser(userId)
    let currentLevel = userBeforeXP.level
    let currentXP = userBeforeXP.xp + amount // Total XP after adding new amount

    let leveledUpThisTime = false
    const originalLevel = userBeforeXP.level

    // Loop to handle multiple level-ups
    let requiredXPForLevelUp = this.calculateRequiredXP(currentLevel)
    while (currentXP >= requiredXPForLevelUp && currentLevel < config.leveling.maxLevel) {
      currentXP -= requiredXPForLevelUp // Subtract XP used for this level up
      currentLevel++ // Increment level
      leveledUpThisTime = true

      // Award level up bonus - NO new transaction here
      // We instantiate EconomyService to use its internal _addBalanceInternal method
      const economyService = new EconomyService(this.client)
      try {
        // Using _addBalanceInternal which is designed to be called within an existing transaction
        await economyService._addBalanceInternal(
          userId,
          config.leveling.levelUpBonus,
          `Level up bonus (Level ${currentLevel})`,
        )
      } catch (e) {
        this.client.logger.error(
          `Failed to add level up bonus for user ${userId} (Level ${currentLevel}) during addXP:`,
          e,
        )
        // If _addBalanceInternal fails, the outer transaction (e.g., from shop buy) should roll back.
        // Re-throw the error to ensure the calling transaction is aware and can roll back.
        throw e
      }
      requiredXPForLevelUp = this.calculateRequiredXP(currentLevel) // XP needed for the *new* current level
    }

    // Update user's final level and XP
    // Only update if level or XP actually changed to avoid unnecessary writes
    if (currentLevel !== userBeforeXP.level || currentXP !== userBeforeXP.xp + amount) {
      // The comparison for currentXP should be against userBeforeXP.xp if we are setting currentXP as remainder
      // Or, if currentXP is total XP, then it's fine.
      // Given currentXP is remainder, let's adjust the condition or ensure it's always updated.
      // For simplicity, we'll update if level changed or if the original XP added (amount) was > 0
      if (currentLevel !== userBeforeXP.level || amount > 0) {
        await this.client.database.updateUser(userId, {
          level: currentLevel,
          xp: currentXP, // This is the XP towards the next level
        })
      }
    }

    // Log the total XP gain event, only if amount > 0 to avoid logging 0 XP gains
    if (amount > 0) {
      await this.client.database.logTransaction(userId, "xp", amount, `XP from ${source}`)
    }

    return {
      level: currentLevel,
      xp: currentXP,
      requiredXP: this.calculateRequiredXP(currentLevel), // XP required for the current newLevel
      leveledUp: leveledUpThisTime,
      newLevel: leveledUpThisTime ? currentLevel : undefined,
    }
  }

  // Get leaderboard
  async getLevelLeaderboard(limit = 10): Promise<any[]> {
    return this.client.database.all("SELECT user_id, level, xp FROM users ORDER BY level DESC, xp DESC LIMIT ?", [
      limit,
    ])
  }
}
