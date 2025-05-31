import type { ExtendedClient } from "../../structures/ExtendedClient"
import { BalanceService } from "./BalanceService"
import { SafeService } from "./SafeService"
import { ClaimService } from "./ClaimService"

export class EconomyService {
  public balance: BalanceService
  public safe: SafeService
  public claims: ClaimService

  constructor(private client: ExtendedClient) {
    this.balance = new BalanceService(client)
    this.safe = new SafeService(client)
    this.claims = new ClaimService(client)
  }

  // Delegate methods for backward compatibility
  async getBalance(userId: string) {
    return this.balance.getBalance(userId)
  }

  async addBalance(userId: string, amount: number, reason: string) {
    return this.balance.addBalance(userId, amount, reason)
  }

  async removeBalance(userId: string, amount: number, reason: string) {
    return this.balance.removeBalance(userId, amount, reason)
  }

  async transferBalance(senderId: string, receiverId: string, amount: number) {
    return this.balance.transferBalance(senderId, receiverId, amount)
  }

  async depositToSafe(userId: string, amount: number) {
    return this.safe.depositToSafe(userId, amount)
  }

  async withdrawFromSafe(userId: string, amount: number) {
    return this.safe.withdrawFromSafe(userId, amount)
  }

  async upgradeSafe(userId: string) {
    return this.safe.upgradeSafe(userId)
  }

  async claimDaily(userId: string) {
    return this.claims.claimDaily(userId)
  }

  async getDailyStatus(userId: string) {
    return this.claims.getDailyStatus(userId)
  }
}
