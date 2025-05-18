import { logger } from "./logger"
import path from "path"
import fs from "fs"

// Update the UserReputation interface to store who the user has given reputation to
export interface UserReputation {
  userId: string
  username: string
  receivedPositive: number
  receivedNegative: number
  givenPositive: number
  givenNegative: number
  givenTo: Record<string, boolean> // userId -> true (permanent record of who received rep)
}

// Path to the data directory
const DATA_DIR = path.join(process.cwd(), "data")

// Filename for reputation data
const REPUTATION_FILENAME = path.join(DATA_DIR, "reputation.json")

// Reputation data
let reputationData: UserReputation[] = []

// Remove the REP_COOLDOWN constant since we're not using a time-based cooldown anymore

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
 * Loads reputation data from the JSON file
 */
function loadReputationData(): UserReputation[] {
  try {
    if (fs.existsSync(REPUTATION_FILENAME)) {
      const data = fs.readFileSync(REPUTATION_FILENAME, "utf8")
      return JSON.parse(data) as UserReputation[]
    } else {
      return []
    }
  } catch (error) {
    logger.error(`Failed to load reputation data from ${REPUTATION_FILENAME}:`, error)
    return []
  }
}

/**
 * Saves reputation data to the JSON file
 */
function saveReputationData(): void {
  try {
    const jsonData = JSON.stringify(reputationData, null, 2)
    fs.writeFileSync(REPUTATION_FILENAME, jsonData, "utf8")
  } catch (error) {
    logger.error(`Failed to save reputation data to ${REPUTATION_FILENAME}:`, error)
  }
}

/**
 * Initializes the reputation manager
 */
export function initReputationManager(): void {
  try {
    // Ensure the data directory exists
    ensureDataDirectory()

    // Load reputation data from file
    reputationData = loadReputationData()
    logger.info(`Loaded reputation data for ${reputationData.length} users`)
  } catch (error) {
    logger.error("Failed to initialize reputation manager:", error)
    reputationData = []
    saveReputationData()
  }
}

// Update the getOrCreateUserRep function to initialize givenTo
function getOrCreateUserRep(userId: string, username: string): UserReputation {
  let userRep = reputationData.find((rep) => rep.userId === userId)

  if (!userRep) {
    userRep = {
      userId,
      username,
      receivedPositive: 0,
      receivedNegative: 0,
      givenPositive: 0,
      givenNegative: 0,
      givenTo: {},
    }
    reputationData.push(userRep)
  }

  // Update username in case it changed
  userRep.username = username

  return userRep
}

// Update the canGiveReputation function to check if the user has already given reputation
export function canGiveReputation(giverId: string, receiverId: string): { canGive: boolean; message: string } {
  // Users can't give reputation to themselves
  if (giverId === receiverId) {
    return { canGive: false, message: "You can't give reputation to yourself." }
  }

  // Check if the giver has already given reputation to the receiver
  const giver = reputationData.find((rep) => rep.userId === giverId)

  if (giver && giver.givenTo[receiverId]) {
    return {
      canGive: false,
      message: "You have already given reputation to this user. You can only give reputation to a user once.",
    }
  }

  return { canGive: true, message: "" }
}

// Update the givePositiveRep function to record that the user has given reputation
export function givePositiveRep(
  giverId: string,
  giverName: string,
  receiverId: string,
  receiverName: string,
): { success: boolean; message: string } {
  const canGive = canGiveReputation(giverId, receiverId)

  if (!canGive.canGive) {
    return { success: false, message: canGive.message }
  }

  const giver = getOrCreateUserRep(giverId, giverName)
  const receiver = getOrCreateUserRep(receiverId, receiverName)

  // Update reputation counts
  giver.givenPositive++
  receiver.receivedPositive++

  // Record that the giver has given reputation to this receiver
  giver.givenTo[receiverId] = true

  // Save changes
  saveReputationData()

  return {
    success: true,
    message: `You gave positive reputation to ${receiverName}. They now have ${receiver.receivedPositive} positive reputation.`,
  }
}

// Update the giveNegativeRep function to record that the user has given reputation
export function giveNegativeRep(
  giverId: string,
  giverName: string,
  receiverId: string,
  receiverName: string,
): { success: boolean; message: string } {
  const canGive = canGiveReputation(giverId, receiverId)

  if (!canGive.canGive) {
    return { success: false, message: canGive.message }
  }

  const giver = getOrCreateUserRep(giverId, giverName)
  const receiver = getOrCreateUserRep(receiverId, receiverName)

  // Update reputation counts
  giver.givenNegative++
  receiver.receivedNegative++

  // Record that the giver has given reputation to this receiver
  giver.givenTo[receiverId] = true

  // Save changes
  saveReputationData()

  return {
    success: true,
    message: `You gave negative reputation to ${receiverName}. They now have ${receiver.receivedNegative} negative reputation.`,
  }
}

/**
 * Gets a user's reputation data
 * @param userId The user's ID
 * @returns The user's reputation data or undefined if not found
 */
export function getUserReputation(userId: string): UserReputation | undefined {
  return reputationData.find((rep) => rep.userId === userId)
}

// Add this new function after getUserReputation and before the initialization

/**
 * Gets the top users by specified reputation criteria
 * @param sortBy The criteria to sort by
 * @param limit The maximum number of users to return
 * @returns Array of top users
 */
export function getTopUsers(sortBy = "receivedTotal", limit = 10): UserReputation[] {
  // Filter out users with no reputation activity
  const activeUsers = reputationData.filter(
    (rep) => rep.receivedPositive > 0 || rep.receivedNegative > 0 || rep.givenPositive > 0 || rep.givenNegative > 0,
  )

  // Sort by the specified criteria
  return activeUsers
    .sort((a, b) => {
      switch (sortBy.toLowerCase()) {
        case "receivedpositive":
          return b.receivedPositive - a.receivedPositive
        case "receivednegative":
          return b.receivedNegative - a.receivedNegative
        case "receivedtotal":
          return b.receivedPositive - b.receivedNegative - (a.receivedPositive - a.receivedNegative)
        case "givenpositive":
          return b.givenPositive - a.givenPositive
        case "givennegative":
          return b.givenNegative - a.givenNegative
        case "giventotal":
          return b.givenPositive - b.givenNegative - (a.givenPositive - a.givenNegative)
        default:
          return b.receivedPositive - b.receivedNegative - (a.receivedPositive - a.receivedNegative)
      }
    })
    .slice(0, limit)
}

// Initialize reputation manager when the module is imported
initReputationManager()