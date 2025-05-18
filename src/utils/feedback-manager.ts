import { logger } from "./logger"
import path from "path"
import fs from "fs"

// Define the feedback structure
export interface Feedback {
  id: number
  userId: string
  username: string
  content: string
  timestamp: number
}

// Path to the data directory
const DATA_DIR = path.join(process.cwd(), "data")

// Filename for feedback data
const FEEDBACK_FILENAME = path.join(DATA_DIR, "feedback.json")

// Feedback data
let feedbackData: Feedback[] = []

/**
 * Ensures the data directory exists
 */
function ensureDataDirectory(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true })
      logger.info(`Created data directory at ${DATA_DIR}`)
    }
  } catch (error) {
    logger.error("Failed to create data directory:", error)
    throw error
  }
}

/**
 * Loads feedback data from the JSON file
 */
function loadFeedbackData(): Feedback[] {
  try {
    if (fs.existsSync(FEEDBACK_FILENAME)) {
      const data = fs.readFileSync(FEEDBACK_FILENAME, "utf8")
      return JSON.parse(data) as Feedback[]
    } else {
      return []
    }
  } catch (error) {
    logger.error(`Failed to load feedback data from ${FEEDBACK_FILENAME}:`, error)
    return []
  }
}

/**
 * Saves feedback data to the JSON file
 */
function saveFeedbackData(): void {
  try {
    const jsonData = JSON.stringify(feedbackData, null, 2)
    fs.writeFileSync(FEEDBACK_FILENAME, jsonData, "utf8")
  } catch (error) {
    logger.error(`Failed to save feedback data to ${FEEDBACK_FILENAME}:`, error)
  }
}

/**
 * Initializes the feedback manager
 */
export function initFeedbackManager(): void {
  try {
    // Ensure the data directory exists
    ensureDataDirectory()

    // Load feedback data from file
    feedbackData = loadFeedbackData()
    logger.info(`Loaded ${feedbackData.length} feedback entries`)
  } catch (error) {
    logger.error("Failed to initialize feedback manager:", error)
    feedbackData = []
    saveFeedbackData()
  }
}

/**
 * Adds a new feedback entry
 * @param userId The user's ID
 * @param username The user's username
 * @param content The feedback content
 * @returns The added feedback entry
 */
export function addFeedback(userId: string, username: string, content: string): Feedback {
  // Generate a new ID (max ID + 1, or 1 if no feedback exists)
  const newId = feedbackData.length > 0 ? Math.max(...feedbackData.map((f) => f.id)) + 1 : 1

  const feedback: Feedback = {
    id: newId,
    userId,
    username,
    content,
    timestamp: Date.now(),
  }

  feedbackData.push(feedback)
  saveFeedbackData()
  logger.info(`Added feedback #${newId} from ${username}`)

  return feedback
}

/**
 * Gets all feedback entries
 * @returns Array of all feedback entries
 */
export function getAllFeedback(): Feedback[] {
  return [...feedbackData]
}

/**
 * Gets feedback by ID
 * @param id The ID of the feedback to get
 * @returns The feedback entry, or undefined if not found
 */
export function getFeedbackById(id: number): Feedback | undefined {
  return feedbackData.find((f) => f.id === id)
}

// Initialize feedback manager when the module is imported
initFeedbackManager()
