import type { ExtendedClient } from "../structures/ExtendedClient"

export class ReputationService {
  constructor(private client: ExtendedClient) {}

  // Get user's reputation
  async getUserReputation(userId: string): Promise<{ given: number; received: number }> {
    // Ensure user exists in reputation table
    await this.ensureUserExists(userId)

    const reputation = await this.client.database.get("SELECT given, received FROM reputation WHERE user_id = ?", [
      userId,
    ])

    return {
      given: reputation.given,
      received: reputation.received,
    }
  }

  // Give reputation to a user
  async giveReputation(giverId: string, receiverId: string): Promise<void> {
    if (giverId === receiverId) {
      throw new Error("You cannot give reputation to yourself")
    }

    // Check if already given in the last 24 hours
    const lastGiven = await this.client.database.get(
      `SELECT * FROM reputation_logs 
       WHERE giver_id = ? AND receiver_id = ? 
       AND timestamp > datetime('now', '-1 day')`,
      [giverId, receiverId],
    )

    if (lastGiven) {
      throw new Error("You can only give reputation to this user once every 24 hours")
    }

    // Ensure both users exist in reputation table
    await this.ensureUserExists(giverId)
    await this.ensureUserExists(receiverId)

    // Update reputation counts
    await this.client.database.run("UPDATE reputation SET given = given + 1 WHERE user_id = ?", [giverId])

    await this.client.database.run("UPDATE reputation SET received = received + 1 WHERE user_id = ?", [receiverId])

    // Log the reputation
    await this.client.database.run("INSERT INTO reputation_logs (giver_id, receiver_id) VALUES (?, ?)", [
      giverId,
      receiverId,
    ])
  }

  // Take reputation from a user
  async takeReputation(takerId: string, targetId: string): Promise<void> {
    if (takerId === targetId) {
      throw new Error("You cannot take reputation from yourself")
    }

    // Check if already taken in the last 24 hours
    const lastTaken = await this.client.database.get(
      `SELECT * FROM reputation_logs 
       WHERE giver_id = ? AND receiver_id = ? AND timestamp > datetime('now', '-1 day')`,
      [takerId, targetId],
    )

    if (lastTaken) {
      throw new Error("You can only affect this user's reputation once every 24 hours")
    }

    // Ensure both users exist in reputation table
    await this.ensureUserExists(takerId)
    await this.ensureUserExists(targetId)

    // Update reputation counts (given for taker, but decrease received for target)
    await this.client.database.run("UPDATE reputation SET given = given + 1 WHERE user_id = ?", [takerId])

    await this.client.database.run(
      "UPDATE reputation SET received = CASE WHEN received > 0 THEN received - 1 ELSE 0 END WHERE user_id = ?",
      [targetId],
    )

    // Log the reputation action with negative value
    await this.client.database.run("INSERT INTO reputation_logs (giver_id, receiver_id) VALUES (?, ?)", [
      takerId,
      targetId,
    ])
  }

  // Get reputation leaderboard
  async getReputationLeaderboard(type: "given" | "received", limit = 10): Promise<any[]> {
    return this.client.database.all(`SELECT user_id, ${type} as count FROM reputation ORDER BY ${type} DESC LIMIT ?`, [
      limit,
    ])
  }

  // Private helper to ensure user exists in reputation table
  private async ensureUserExists(userId: string): Promise<void> {
    await this.client.database.run("INSERT OR IGNORE INTO reputation (user_id) VALUES (?)", [userId])
  }
}
