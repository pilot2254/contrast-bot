import { logger } from "./logger"
import { getDb } from "./database"

// Define the quote structure
export interface Quote {
  id: number
  text: string
  author: string
  authorId: string
  timestamp: number
}

/**
 * Initializes the quotes manager
 */
export async function initQuotes(): Promise<void> {
  try {
    logger.info("Quote manager initialized")
  } catch (error) {
    logger.error("Failed to initialize quotes:", error)
  }
}

/**
 * Adds a new quote
 * @param text The quote text
 * @param author The author's name
 * @param authorId The author's Discord ID
 * @returns The added quote
 */
export async function addQuote(text: string, author: string, authorId: string): Promise<Quote> {
  try {
    const db = getDb()
    const timestamp = Date.now()

    const result = await db.run(
      "INSERT INTO quotes (text, author, author_id, timestamp) VALUES (?, ?, ?, ?)",
      text,
      author,
      authorId,
      timestamp,
    )

    const id = result.lastID || 0

    logger.info(`Added quote #${id} by ${author}`)

    return {
      id,
      text,
      author,
      authorId,
      timestamp,
    }
  } catch (error) {
    logger.error("Failed to add quote:", error)
    throw error
  }
}

/**
 * Gets a quote by ID
 * @param id The ID of the quote to get
 * @returns The quote, or undefined if not found
 */
export async function getQuoteById(id: number): Promise<Quote | undefined> {
  try {
    const db = getDb()
    const quote = await db.get("SELECT id, text, author, author_id, timestamp FROM quotes WHERE id = ?", id)

    if (!quote) {
      return undefined
    }

    return {
      id: quote.id,
      text: quote.text,
      author: quote.author,
      authorId: quote.author_id,
      timestamp: quote.timestamp,
    }
  } catch (error) {
    logger.error(`Failed to get quote #${id}:`, error)
    return undefined
  }
}

/**
 * Gets a random quote
 * @returns A random quote, or undefined if no quotes exist
 */
export async function getRandomQuote(): Promise<Quote | undefined> {
  try {
    const db = getDb()
    const quote = await db.get("SELECT id, text, author, author_id, timestamp FROM quotes ORDER BY RANDOM() LIMIT 1")

    if (!quote) {
      return undefined
    }

    return {
      id: quote.id,
      text: quote.text,
      author: quote.author,
      authorId: quote.author_id,
      timestamp: quote.timestamp,
    }
  } catch (error) {
    logger.error("Failed to get random quote:", error)
    return undefined
  }
}

/**
 * Gets all quotes
 * @returns Array of all quotes
 */
export async function getAllQuotes(): Promise<Quote[]> {
  try {
    const db = getDb()
    const quotes = await db.all("SELECT id, text, author, author_id, timestamp FROM quotes ORDER BY id")

    return quotes.map((quote) => ({
      id: quote.id,
      text: quote.text,
      author: quote.author,
      authorId: quote.author_id,
      timestamp: quote.timestamp,
    }))
  } catch (error) {
    logger.error("Failed to get all quotes:", error)
    return []
  }
}
