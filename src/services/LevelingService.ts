import type { ExtendedClient } from "../structures/ExtendedClient"
import { config } from "../config/bot.config"

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
    newLevel?: number
  }> {
    // Get current level data
    const user = await this.client.database.getUser(userId)
    const currentLevel = user.level
    const currentXP = user.xp
    const requiredXP = this.calculateRequiredXP(currentLevel)

    // Add XP
    const newXP = currentXP + amount
    let newLevel = currentLevel
    let leveledUp = false

    // Check for level up
    if (newXP >= requiredXP && currentLevel < config.leveling.maxLevel) {
      newLevel = currentLevel + 1
      leveledUp = true

      // Award level up bonus - we'll handle this directly here
      await this.client.database.transaction(async () => {
        // Get current balance
        const user = await this.client.database.getUser(userId)
        const newBalance = user.balance + config.leveling.levelUpBonus

        // Update balance
        await this.client.database.updateUser(userId, { balance: newBalance })

        // Log transaction
        await this.client.database.logTransaction(
          userId,
          "add",
          config.leveling.levelUpBonus,
          `Level up bonus (Level ${newLevel})`,
        )
      })
    }

    // Update user
    await this.client.database.updateUser(userId, {
      level: newLevel,
      xp: newXP,
    })

    // Log XP gain
    await this.client.database.logTransaction(userId, "xp", amount, `XP from ${source}`)

    return {
      level: newLevel,
      xp: newXP,
      requiredXP: this.calculateRequiredXP(newLevel),
      leveledUp,
      newLevel: leveledUp ? newLevel : undefined,
    }
  }

  // Get leaderboard
  async getLevelLeaderboard(limit = 10): Promise<any[]> {
    return this.client.database.all("SELECT user_id, level, xp FROM users ORDER BY level DESC, xp DESC LIMIT ?", [
      limit,
    ])
  }
}
