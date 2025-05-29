import type { ExtendedClient } from "../structures/ExtendedClient"
import { config } from "../config/bot.config"

export class WorkManager {
  constructor(private client: ExtendedClient) {}

  // Work messages for different levels
  private workMessages = [
    // Level 1-5
    [
      "You helped an old lady cross the street and she gave you a tip.",
      "You mowed your neighbor's lawn.",
      "You washed dishes at a local restaurant.",
      "You delivered newspapers around the neighborhood.",
      "You walked someone's dog for an hour.",
    ],
    // Level 6-10
    [
      "You worked a shift at the local grocery store.",
      "You fixed someone's computer.",
      "You tutored a student in math.",
      "You helped paint a house.",
      "You worked as a barista for a day.",
    ],
    // Level 11-20
    [
      "You worked as a freelance writer for a blog.",
      "You designed a logo for a small business.",
      "You worked as a personal trainer for a client.",
      "You did some accounting work for a local business.",
      "You worked as a sales representative and earned commission.",
    ],
    // Level 21-30
    [
      "You consulted for a medium-sized company.",
      "You developed a small website for a client.",
      "You managed a team for a project and earned a bonus.",
      "You sold a valuable item at an auction.",
      "You worked as a professional photographer for an event.",
    ],
    // Level 31+
    [
      "You closed a major business deal.",
      "You invested in stocks and made a profit.",
      "You sold your app to a tech company.",
      "You discovered a rare artifact and sold it to a museum.",
      "You received royalties from your bestselling book.",
    ],
  ]

  // Get work message based on level
  private getWorkMessage(level: number): string {
    let tier = 0

    if (level <= 5) tier = 0
    else if (level <= 10) tier = 1
    else if (level <= 20) tier = 2
    else if (level <= 30) tier = 3
    else tier = 4

    const messages = this.workMessages[tier]
    return messages[Math.floor(Math.random() * messages.length)]
  }

  // Calculate work reward based on level
  private calculateWorkReward(level: number): number {
    // Base reward increases with level, capped at max reward
    const reward = Math.min(config.economy.work.baseReward * level, config.economy.work.maxReward)

    // Add some randomness (±10%)
    const randomFactor = 0.9 + Math.random() * 0.2

    return Math.floor(reward * randomFactor)
  }

  // Check if user can work (cooldown)
  async canWork(userId: string): Promise<{ canWork: boolean; timeLeft: number }> {
    const cooldown = await this.client.database.get(
      "SELECT expires_at FROM cooldowns WHERE user_id = ? AND command = 'work'",
      [userId],
    )

    if (!cooldown) {
      return { canWork: true, timeLeft: 0 }
    }

    const now = Date.now()
    const expiresAt = new Date(cooldown.expires_at).getTime()

    if (now >= expiresAt) {
      return { canWork: true, timeLeft: 0 }
    }

    return { canWork: false, timeLeft: expiresAt - now }
  }

  // Perform work
  async work(userId: string): Promise<{
    reward: number
    message: string
    xpGained: number
    leveledUp: boolean
    newLevel?: number
  }> {
    // Check cooldown
    const { canWork, timeLeft } = await this.canWork(userId)

    if (!canWork) {
      throw new Error(`You need to wait ${Math.ceil(timeLeft / 1000)} seconds before working again`)
    }

    // Get user level
    const user = await this.client.database.getUser(userId)
    const level = user.level

    // Calculate reward
    const reward = this.calculateWorkReward(level)

    // Get work message
    const message = this.getWorkMessage(level)

    // Add reward to balance
    await this.client.database.transaction(async () => {
      // Update balance
      await this.client.database.updateUser(userId, { balance: user.balance + reward })

      // Log transaction
      await this.client.database.logTransaction(userId, "add", reward, "Work")
    })

    // Add XP
    const levelingService = await import("../services/LevelingService").then((m) => new m.LevelingService(this.client))
    const xpResult = await levelingService.addXP(userId, config.economy.work.xpReward, "Work")

    // Set cooldown
    const expiresAt = new Date(Date.now() + config.economy.work.cooldown)

    await this.client.database.run(
      `INSERT INTO cooldowns (user_id, command, expires_at) 
       VALUES (?, 'work', ?) 
       ON CONFLICT(user_id, command) 
       DO UPDATE SET expires_at = ?`,
      [userId, expiresAt, expiresAt],
    )

    return {
      reward,
      message,
      xpGained: config.economy.work.xpReward,
      leveledUp: xpResult.leveledUp,
      newLevel: xpResult.newLevel,
    }
  }
}
