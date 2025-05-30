import type { ExtendedClient } from "../structures/ExtendedClient"

interface ReputationCounts {
  given: number
  received: number
}

interface ReputationLog {
  id: number
  giver_id: string
  receiver_id: string
  timestamp: string // ISO Date string
}

interface ReputationLeaderboardEntry {
  user_id: string
  count: number // Can be 'given' or 'received' count
}

export class ReputationService {
  constructor(private client: ExtendedClient) {}

  async getUserReputation(userId: string): Promise<ReputationCounts> {
    await this.ensureUserExists(userId)
    const reputation = await this.client.database.get<{
      given: number
      received: number
    }>("SELECT given, received FROM reputation WHERE user_id = ?", [userId])
    return reputation || { given: 0, received: 0 } // Default if somehow not found
  }

  async giveReputation(giverId: string, receiverId: string): Promise<void> {
    if (giverId === receiverId) {
      throw new Error("You cannot give reputation to yourself")
    }
    const lastGiven = await this.client.database.get<ReputationLog>(
      `SELECT * FROM reputation_logs 
       WHERE giver_id = ? AND receiver_id = ? 
       AND timestamp > datetime('now', '-1 day')`,
      [giverId, receiverId]
    )
    if (lastGiven) {
      throw new Error(
        "You can only give reputation to this user once every 24 hours"
      )
    }
    await this.ensureUserExists(giverId)
    await this.ensureUserExists(receiverId)

    await this.client.database.run(
      "UPDATE reputation SET given = given + 1 WHERE user_id = ?",
      [giverId]
    )
    await this.client.database.run(
      "UPDATE reputation SET received = received + 1 WHERE user_id = ?",
      [receiverId]
    )
    await this.client.database.run(
      "INSERT INTO reputation_logs (giver_id, receiver_id) VALUES (?, ?)",
      [giverId, receiverId]
    )
  }

  async takeReputation(takerId: string, targetId: string): Promise<void> {
    if (takerId === targetId) {
      throw new Error("You cannot take reputation from yourself")
    }
    const lastAction = await this.client.database.get<ReputationLog>(
      // Check if taker already interacted with target
      `SELECT * FROM reputation_logs 
       WHERE giver_id = ? AND receiver_id = ? AND timestamp > datetime('now', '-1 day')`,
      [takerId, targetId] // Note: This log structure might need adjustment if "take" is a distinct action type
    )
    if (lastAction) {
      throw new Error(
        "You can only affect this user's reputation (give/take) once every 24 hours"
      )
    }
    await this.ensureUserExists(takerId)
    await this.ensureUserExists(targetId)

    // For "take", the taker "gives" a negative rep, target "receives" a negative rep.
    // The current 'given' count for taker might represent "actions taken".
    // This logic might need refinement based on how "given" vs "actions" are tracked.
    await this.client.database.run(
      "UPDATE reputation SET given = given + 1 WHERE user_id = ?",
      [takerId]
    ) // Or a different counter for "actions_taken"
    await this.client.database.run(
      "UPDATE reputation SET received = CASE WHEN received > 0 THEN received - 1 ELSE 0 END WHERE user_id = ?",
      [targetId]
    )
    // Log this specific action, perhaps with a type if logs distinguish between give/take
    await this.client.database.run(
      "INSERT INTO reputation_logs (giver_id, receiver_id) VALUES (?, ?)",
      [
        // Consider adding a 'type' column to logs
        takerId,
        targetId,
      ]
    )
  }

  async getReputationLeaderboard(
    type: "given" | "received",
    limit = 10
  ): Promise<ReputationLeaderboardEntry[]> {
    return this.client.database.all<ReputationLeaderboardEntry>(
      `SELECT user_id, ${type} as count FROM reputation ORDER BY ${type} DESC LIMIT ?`,
      [limit]
    )
  }

  private async ensureUserExists(userId: string): Promise<void> {
    await this.client.database.run(
      "INSERT OR IGNORE INTO reputation (user_id) VALUES (?)",
      [userId]
    )
  }
}
