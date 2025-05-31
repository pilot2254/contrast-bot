import type { ExtendedClient } from "../../structures/ExtendedClient"
import { config } from "../../config/config"

export class BalanceService {
  constructor(private client: ExtendedClient) {}

  async getBalance(
    userId: string
  ): Promise<{ wallet: number; safe: number; safeCapacity: number }> {
    const user = await this.client.database.getUser(userId)
    return {
      wallet: user.balance,
      safe: user.safe_balance,
      safeCapacity: user.safe_capacity,
    }
  }

  async addBalance(
    userId: string,
    amount: number,
    reason: string
  ): Promise<number> {
    if (amount <= 0) throw new Error("Amount must be positive")

    return await this.client.database.transaction(async () => {
      await this.client.database.createUser(userId)
      const user = await this.client.database.getUser(userId)
      const newBalance = user.balance + amount

      if (
        config.economy.currency.maxWalletAmount !== Number.POSITIVE_INFINITY &&
        newBalance > config.economy.currency.maxWalletAmount
      ) {
        throw new Error(
          `Wallet cannot hold more than ${config.economy.currency.maxWalletAmount.toLocaleString()} ${config.economy.currency.symbol}`
        )
      }

      await this.client.database.updateUser(userId, { balance: newBalance })
      await this.client.database.logTransaction(userId, "add", amount, reason)
      return newBalance
    })
  }

  async removeBalance(
    userId: string,
    amount: number,
    reason: string
  ): Promise<number> {
    if (amount <= 0) throw new Error("Amount must be positive")

    return await this.client.database.transaction(async () => {
      await this.client.database.createUser(userId)
      const user = await this.client.database.getUser(userId)

      if (user.balance < amount) {
        throw new Error(
          `Insufficient balance. You need ${amount.toLocaleString()} ${config.economy.currency.symbol}, but you only have ${user.balance.toLocaleString()} ${config.economy.currency.symbol}`
        )
      }

      const newBalance = user.balance - amount
      await this.client.database.updateUser(userId, { balance: newBalance })
      await this.client.database.logTransaction(
        userId,
        "remove",
        amount,
        reason
      )
      return newBalance
    })
  }

  async transferBalance(
    senderId: string,
    receiverId: string,
    amount: number
  ): Promise<{ senderBalance: number; receiverBalance: number }> {
    if (amount <= 0) throw new Error("Amount must be positive")
    if (senderId === receiverId)
      throw new Error("You cannot transfer to yourself")

    if (
      config.economy.currency.maxTransactionAmount !==
        Number.POSITIVE_INFINITY &&
      amount > config.economy.currency.maxTransactionAmount
    ) {
      throw new Error(
        `Cannot transfer more than ${config.economy.currency.maxTransactionAmount.toLocaleString()} ${config.economy.currency.symbol}`
      )
    }

    return await this.client.database.transaction(async () => {
      await this.client.database.createUser(senderId)
      await this.client.database.createUser(receiverId)

      const sender = await this.client.database.getUser(senderId)
      if (sender.balance < amount) {
        throw new Error(
          `Insufficient balance. You need ${amount.toLocaleString()} ${config.economy.currency.symbol}, but you only have ${sender.balance.toLocaleString()} ${config.economy.currency.symbol}`
        )
      }

      const senderBalance = await this.removeBalance(
        senderId,
        amount,
        `Transfer to ${receiverId}`
      )
      const receiverBalance = await this.addBalance(
        receiverId,
        amount,
        `Transfer from ${senderId}`
      )

      return { senderBalance, receiverBalance }
    })
  }
}
