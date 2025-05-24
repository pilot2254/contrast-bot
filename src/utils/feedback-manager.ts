import { logger } from "./logger"
import { getDb } from "./database"

// Define the feedback structure
export interface Feedback {
  id: number
  userId: string
  username: string
  content: string
  timestamp: number
}

/**
 * Initializes the feedback manager
 */
export async function initFeedbackManager(): Promise<void> {
  try {
    logger.info("Feedback manager initialized")
  } catch (error) {
    logger.error("Failed to initialize feedback manager:", error)
  }
}

/**
 * Adds a new feedback entry
 * @param userId The user's ID
 * @param username The user's username
 * @param content The feedback content
 * @returns The added feedback entry
 */
export async function addFeedback(userId: string, username: string, content: string): Promise<Feedback> {
  try {
    const db = getDb()
    const timestamp = Date.now()

    const result = await db.run(
      "INSERT INTO feedback (user_id, username, content, timestamp) VALUES (?, ?, ?, ?)",
      userId,
      username,
      content,
      timestamp,
    )

    const id = result.lastID || 0

    logger.info(`Added feedback #${id} from ${username}`)

    return {
      id,
      userId,
      username,
      content,
      timestamp,
    }
  } catch (error) {
    logger.error("Failed to add feedback:", error)
    throw error
  }
}

/**
 * Gets all feedback entries
 * @returns Array of all feedback entries
 */
export async function getAllFeedback(): Promise<Feedback[]> {
  try {
    const db = getDb()
    const feedback = await db.all(
      "SELECT id, user_id, username, content, timestamp FROM feedback ORDER BY timestamp DESC",
    )

    return feedback.map((entry) => ({
      id: entry.id,
      userId: entry.user_id,
      username: entry.username,
      content: entry.content,
      timestamp: entry.timestamp,
    }))
  } catch (error) {
    logger.error("Failed to get all feedback:", error)
    return []
  }
}

/**
 * Gets feedback by ID
 * @param id The ID of the feedback to get
 * @returns The feedback entry, or undefined if not found
 */
export async function getFeedbackById(id: number): Promise<Feedback | undefined> {
  try {
    const db = getDb()
    const feedback = await db.get("SELECT id, user_id, username, content, timestamp FROM feedback WHERE id = ?", id)

    if (!feedback) {
      return undefined
    }

    return {
      id: feedback.id,
      userId: feedback.user_id,
      username: feedback.username,
      content: feedback.content,
      timestamp: feedback.timestamp,
    }
  } catch (error) {
    logger.error(`Failed to get feedback #${id}:`, error)
    return undefined
  }
}
