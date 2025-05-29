import type { ExtendedClient } from "../structures/ExtendedClient"

interface CommandUsage {
  command_name: string
  usage_count: number
}

interface EconomyStats {
  totalCoins: number
  richestUser: { userId: string; balance: number }
  averageBalance: number
}

export class StatsManager {
  constructor(private client: ExtendedClient) {}

  async getTotalCommandsUsed(): Promise<number> {
    const result = await this.client.database.get<{ total: number }>(
      "SELECT SUM(usage_count) as total FROM command_stats",
    )
    return result?.total || 0
  }

  async getTopCommands(limit = 10): Promise<CommandUsage[]> {
    return this.client.database.all<CommandUsage>(
      "SELECT command_name, usage_count FROM command_stats ORDER BY usage_count DESC LIMIT ?",
      [limit],
    )
  }

  async getDatabaseSize(): Promise<number> {
    const pageCountResult = await this.client.database.get<{ page_count: number }>("PRAGMA page_count")
    const pageSizeResult = await this.client.database.get<{ page_size: number }>("PRAGMA page_size")

    const pageCount = pageCountResult?.page_count || 0
    const pageSize = pageSizeResult?.page_size || 0

    const sizeInBytes = pageCount * pageSize
    const sizeInMB = sizeInBytes / (1024 * 1024)
    return Number.parseFloat(sizeInMB.toFixed(2))
  }

  async getUserCount(): Promise<number> {
    const result = await this.client.database.get<{ count: number }>("SELECT COUNT(*) as count FROM users")
    return result?.count || 0
  }

  async getEconomyStats(): Promise<EconomyStats> {
    const totalCoinsResult = await this.client.database.get<{ total: number }>(
      "SELECT SUM(balance + safe_balance) as total FROM users",
    )
    const richestUserResult = await this.client.database.get<{ user_id: string; total_balance: number }>(
      "SELECT user_id, balance + safe_balance as total_balance FROM users ORDER BY total_balance DESC LIMIT 1",
    )
    const averageBalanceResult = await this.client.database.get<{ average: number }>(
      "SELECT AVG(balance + safe_balance) as average FROM users",
    )

    return {
      totalCoins: totalCoinsResult?.total || 0,
      richestUser: richestUserResult
        ? { userId: richestUserResult.user_id, balance: richestUserResult.total_balance }
        : { userId: "N/A", balance: 0 },
      averageBalance: averageBalanceResult?.average || 0,
    }
  }

  getBotUptime(): string {
    const uptime = this.client.uptime || 0
    const days = Math.floor(uptime / (1000 * 60 * 60 * 24))
    const hours = Math.floor((uptime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((uptime % (1000 * 60)) / 1000)
    return `${days}d ${hours}h ${minutes}m ${seconds}s`
  }
}
