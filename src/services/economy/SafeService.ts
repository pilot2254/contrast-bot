import type { ExtendedClient } from "../../structures/ExtendedClient"
import { config } from "../../config/config"

export class SafeService {
  constructor(private client: ExtendedClient) {}

  async depositToSafe(
    userId: string,
    amount: number
  ): Promise<{ wallet: number; safe: number }> {
    if (amount <= 0) throw new Error("Amount must be positive")

    return await this.client.database.transaction(async () => {
      await this.client.database.createUser(userId)
      const user = await this.client.database.getUser(userId)

      if (user.balance < amount) {
        throw new Error(
          `Insufficient balance. You need ${amount.toLocaleString()} ${config.economy.currency.symbol}, but you only have ${user.balance.toLocaleString()} ${config.economy.currency.symbol}`
        )
      }

      const remainingCapacity = user.safe_capacity - user.safe_balance
      if (amount > remainingCapacity) {
        throw new Error(
          `Your safe can only hold ${remainingCapacity.toLocaleString()} more ${config.economy.currency.symbol}`
        )
      }

      const newWalletBalance = user.balance - amount
      const newSafeBalance = user.safe_balance + amount

      await this.client.database.updateUser(userId, {
        balance: newWalletBalance,
        safe_balance: newSafeBalance,
      })

      await this.client.database.logTransaction(
        userId,
        "deposit",
        amount,
        "Deposit to safe"
      )
      return { wallet: newWalletBalance, safe: newSafeBalance }
    })
  }

  async withdrawFromSafe(
    userId: string,
    amount: number
  ): Promise<{ wallet: number; safe: number }> {
    if (amount <= 0) throw new Error("Amount must be positive")

    return await this.client.database.transaction(async () => {
      await this.client.database.createUser(userId)
      const user = await this.client.database.getUser(userId)

      if (user.safe_balance < amount) {
        throw new Error(
          `Insufficient safe balance. You need ${amount.toLocaleString()} ${config.economy.currency.symbol}, but you only have ${user.safe_balance.toLocaleString()} ${config.economy.currency.symbol} in your safe`
        )
      }

      const newWalletBalance = user.balance + amount
      if (
        config.economy.currency.maxWalletAmount !== Number.POSITIVE_INFINITY &&
        newWalletBalance > config.economy.currency.maxWalletAmount
      ) {
        throw new Error(
          `Your wallet cannot hold more than ${config.economy.currency.maxWalletAmount.toLocaleString()} ${config.economy.currency.symbol}`
        )
      }

      const newSafeBalance = user.safe_balance - amount

      await this.client.database.updateUser(userId, {
        balance: newWalletBalance,
        safe_balance: newSafeBalance,
      })

      await this.client.database.logTransaction(
        userId,
        "withdraw",
        amount,
        "Withdraw from safe"
      )
      return { wallet: newWalletBalance, safe: newSafeBalance }
    })
  }

  async upgradeSafe(
    userId: string
  ): Promise<{ tier: number; capacity: number; cost: number }> {
    return await this.client.database.transaction(async () => {
      await this.client.database.createUser(userId)
      const user = await this.client.database.getUser(userId)

      const currentTier = user.safe_tier
      const nextTier = currentTier + 1
      const upgradeCost = Math.floor(
        config.economy.safe.baseCost *
          Math.pow(config.economy.safe.upgradeMultiplier, currentTier - 1)
      )

      if (user.balance < upgradeCost) {
        throw new Error(
          `Insufficient balance. Safe upgrade costs ${upgradeCost.toLocaleString()} ${config.economy.currency.symbol}, but you only have ${user.balance.toLocaleString()} ${config.economy.currency.symbol}`
        )
      }

      const newCapacity =
        config.economy.safe.baseCapacity +
        (nextTier - 1) * config.economy.safe.capacityIncreasePerTier

      await this.client.database.updateUser(userId, {
        balance: user.balance - upgradeCost,
        safe_tier: nextTier,
        safe_capacity: newCapacity,
      })

      await this.client.database.logTransaction(
        userId,
        "remove",
        upgradeCost,
        "Safe upgrade"
      )
      return { tier: nextTier, capacity: newCapacity, cost: upgradeCost }
    })
  }
}
