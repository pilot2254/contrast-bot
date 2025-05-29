import type { ExtendedClient } from "../structures/ExtendedClient"

export class BlacklistManager {
  constructor(private client: ExtendedClient) {}

  // Add user to blacklist
  async addToBlacklist(userId: string, reason: string, blacklistedBy: string): Promise<void> {
    // Check if user is already blacklisted
    const blacklisted = await this.isBlacklisted(userId)

    if (blacklisted) {
      throw new Error("User is already blacklisted")
    }

    // Add to blacklist
    await this.client.database.run("INSERT INTO blacklist (user_id, reason, blacklisted_by) VALUES (?, ?, ?)", [
      userId,
      reason,
      blacklistedBy,
    ])
  }

  // Remove user from blacklist
  async removeFromBlacklist(userId: string): Promise<void> {
    // Check if user is blacklisted
    const blacklisted = await this.isBlacklisted(userId)

    if (!blacklisted) {
      throw new Error("User is not blacklisted")
    }

    // Remove from blacklist
    await this.client.database.run("DELETE FROM blacklist WHERE user_id = ?", [userId])
  }

  // Check if user is blacklisted
  async isBlacklisted(userId: string): Promise<boolean> {
    const blacklisted = await this.client.database.get("SELECT * FROM blacklist WHERE user_id = ?", [userId])

    return !!blacklisted
  }

  // Get blacklist entry
  async getBlacklistEntry(userId: string): Promise<any> {
    return this.client.database.get("SELECT * FROM blacklist WHERE user_id = ?", [userId])
  }

  // Get all blacklisted users
  async getBlacklist(): Promise<any[]> {
    return this.client.database.all("SELECT * FROM blacklist ORDER BY blacklisted_at DESC")
  }
}
