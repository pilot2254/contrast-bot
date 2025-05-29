import type { ExtendedClient } from "../structures/ExtendedClient";

export class StatsManager {
  constructor(private client: ExtendedClient) {}

  // Get total commands used
  async getTotalCommandsUsed(): Promise<number> {
    const result = await this.client.database.get(
      "SELECT SUM(usage_count) as total FROM command_stats",
    );

    return result?.total || 0;
  }

  // Get top commands
  async getTopCommands(limit = 10): Promise<any[]> {
    return this.client.database.all(
      "SELECT command_name, usage_count FROM command_stats ORDER BY usage_count DESC LIMIT ?",
      [limit],
    );
  }

  // Get database size
  async getDatabaseSize(): Promise<number> {
    // This is a SQLite-specific query to get the page count and page size
    const pageCount = await this.client.database.get("PRAGMA page_count");
    const pageSize = await this.client.database.get("PRAGMA page_size");

    // Calculate size in MB
    const sizeInBytes = pageCount.page_count * pageSize.page_size;
    const sizeInMB = sizeInBytes / (1024 * 1024);

    return Number.parseFloat(sizeInMB.toFixed(2));
  }

  // Get user count
  async getUserCount(): Promise<number> {
    const result = await this.client.database.get(
      "SELECT COUNT(*) as count FROM users",
    );
    return result.count;
  }

  // Get total economy stats
  async getEconomyStats(): Promise<{
    totalCoins: number;
    richestUser: { userId: string; balance: number };
    averageBalance: number;
  }> {
    const totalCoins = await this.client.database.get(
      "SELECT SUM(balance) + SUM(safe_balance) as total FROM users",
    );

    const richestUser = await this.client.database.get(
      "SELECT user_id, balance + safe_balance as total FROM users ORDER BY total DESC LIMIT 1",
    );

    const averageBalance = await this.client.database.get(
      "SELECT AVG(balance + safe_balance) as average FROM users",
    );

    return {
      totalCoins: totalCoins.total || 0,
      richestUser: richestUser
        ? { userId: richestUser.user_id, balance: richestUser.total }
        : { userId: "none", balance: 0 },
      averageBalance: averageBalance.average || 0,
    };
  }

  // Get bot uptime
  getBotUptime(): string {
    const uptime = this.client.uptime || 0;

    const days = Math.floor(uptime / (1000 * 60 * 60 * 24));
    const hours = Math.floor(
      (uptime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
    );
    const minutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((uptime % (1000 * 60)) / 1000);

    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
  }
}
