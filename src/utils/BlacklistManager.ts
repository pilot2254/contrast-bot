import type { ExtendedClient } from "../structures/ExtendedClient"

interface BlacklistEntry {
  user_id: string
  reason: string
  blacklisted_by: string
  blacklisted_at: string // ISO Date string
}

export class BlacklistManager {
  constructor(private client: ExtendedClient) {}

  async addToBlacklist(userId: string, reason: string, blacklistedBy: string): Promise<void> {
    const blacklisted = await this.isBlacklisted(userId)
    if (blacklisted) {
      throw new Error("User is already blacklisted")
    }
    await this.client.database.run("INSERT INTO blacklist (user_id, reason, blacklisted_by) VALUES (?, ?, ?)", [
      userId,
      reason,
      blacklistedBy,
    ])
  }

  async removeFromBlacklist(userId: string): Promise<void> {
    const blacklisted = await this.isBlacklisted(userId)
    if (!blacklisted) {
      throw new Error("User is not blacklisted")
    }
    await this.client.database.run("DELETE FROM blacklist WHERE user_id = ?", [userId])
  }

  async isBlacklisted(userId: string): Promise<boolean> {
    const entry = await this.client.database.get<BlacklistEntry>("SELECT user_id FROM blacklist WHERE user_id = ?", [
      userId,
    ])
    return !!entry
  }

  async getBlacklistEntry(userId: string): Promise<BlacklistEntry | undefined> {
    return this.client.database.get<BlacklistEntry>("SELECT * FROM blacklist WHERE user_id = ?", [userId])
  }

  async getBlacklist(): Promise<BlacklistEntry[]> {
    return this.client.database.all<BlacklistEntry>("SELECT * FROM blacklist ORDER BY blacklisted_at DESC")
  }
}
