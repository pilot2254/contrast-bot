import type { ExtendedClient } from "../../structures/ExtendedClient"
import { config } from "../../config/config"
import { BalanceService } from "./BalanceService"

export class ClaimService {
  private balanceService: BalanceService

  constructor(private client: ExtendedClient) {
    this.balanceService = new BalanceService(client)
  }

  async claimDaily(userId: string): Promise<{ amount: number; streak: number }> {
    return await this.client.database.transaction(async () => {
      await this.client.database.createUser(userId)

      const claim = await this.client.database.get("SELECT * FROM claims WHERE user_id = ? AND claim_type = 'daily'", [
        userId,
      ])

      const now = Date.now()

      if (claim) {
        const lastClaimed = new Date(claim.last_claimed).getTime()
        const timeSinceClaim = now - lastClaimed

        if (timeSinceClaim < 24 * 60 * 60 * 1000) {
          const timeLeft = 24 * 60 * 60 * 1000 - timeSinceClaim
          const hours = Math.floor(timeLeft / (1000 * 60 * 60))
          const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60))
          throw new Error(`You can claim your daily reward in ${hours}h ${minutes}m`)
        }

        let streak = claim.streak
        if (timeSinceClaim < 48 * 60 * 60 * 1000) {
          streak += 1
        } else {
          streak = 1
        }

        let amount = config.economy.daily.amount
        if (config.economy.daily.streak.enabled) {
          const streakMultiplier = Math.min(
            streak * config.economy.daily.streak.multiplier,
            config.economy.daily.streak.maxMultiplier,
          )
          amount = Math.floor(amount * (1 + streakMultiplier))
        }

        await this.client.database.run(
          "UPDATE claims SET last_claimed = ?, streak = ? WHERE user_id = ? AND claim_type = 'daily'",
          [now, streak, userId],
        )

        await this.balanceService.addBalance(userId, amount, "Daily reward")
        return { amount, streak }
      } else {
        await this.client.database.run(
          "INSERT INTO claims (user_id, claim_type, last_claimed, streak) VALUES (?, ?, ?, ?)",
          [userId, "daily", now, 1],
        )

        await this.balanceService.addBalance(userId, config.economy.daily.amount, "Daily reward")
        return { amount: config.economy.daily.amount, streak: 1 }
      }
    })
  }

  async getDailyStatus(userId: string): Promise<{ claimed: boolean; timeLeft: number; streak: number }> {
    await this.client.database.createUser(userId)

    const claim = await this.client.database.get("SELECT * FROM claims WHERE user_id = ? AND claim_type = 'daily'", [
      userId,
    ])

    if (!claim) {
      return { claimed: false, timeLeft: 0, streak: 0 }
    }

    const lastClaimed = new Date(claim.last_claimed).getTime()
    const now = Date.now()
    const timeSinceClaim = now - lastClaimed
    const timeLeft = Math.max(0, 24 * 60 * 60 * 1000 - timeSinceClaim)

    return {
      claimed: timeLeft > 0,
      timeLeft,
      streak: claim.streak,
    }
  }
}
