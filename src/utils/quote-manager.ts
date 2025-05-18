import { logger } from "./logger"
import path from "path"
import fs from "fs"

// Define the quote structure
export interface Quote {
  id: number
  text: string
  author: string
  authorId: string
  timestamp: number
}

// Path to the data directory (outside of src)
const DATA_DIR = path.join(process.cwd(), "data")

// Filename for quotes
const QUOTES_FILENAME = path.join(DATA_DIR, "quotes.json")

// Default quotes data
const defaultQuotes: Quote[] = []

// Quotes instance
let quotes: Quote[] = []

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
 * Loads quotes from the JSON file
 */
function loadQuotes(): Quote[] {
  try {
    if (fs.existsSync(QUOTES_FILENAME)) {
      const data = fs.readFileSync(QUOTES_FILENAME, "utf8")
      return JSON.parse(data) as Quote[]
    } else {
      return [...defaultQuotes]
    }
  } catch (error) {
    logger.error(`Failed to load quotes from ${QUOTES_FILENAME}:`, error)
    return [...defaultQuotes]
  }
}

/**
 * Saves quotes to the JSON file
 */
function saveQuotesToFile(): void {
  try {
    const jsonData = JSON.stringify(quotes, null, 2)
    fs.writeFileSync(QUOTES_FILENAME, jsonData, "utf8")
  } catch (error) {
    logger.error(`Failed to save quotes to ${QUOTES_FILENAME}:`, error)
  }
}

/**
 * Initializes the quotes manager
 */
export function initQuotes(): void {
  try {
    // Ensure the data directory exists
    ensureDataDirectory()

    // Load quotes from file
    quotes = loadQuotes()
    logger.info(`Loaded ${quotes.length} quotes from file`)
  } catch (error) {
    logger.error("Failed to initialize quotes:", error)
    quotes = [...defaultQuotes]
    saveQuotesToFile()
  }
}

/**
 * Adds a new quote
 * @param text The quote text
 * @param author The author's name
 * @param authorId The author's Discord ID
 * @returns The added quote
 */
export function addQuote(text: string, author: string, authorId: string): Quote {
  // Generate a new ID (max ID + 1, or 1 if no quotes exist)
  const newId = quotes.length > 0 ? Math.max(...quotes.map((q) => q.id)) + 1 : 1

  const quote: Quote = {
    id: newId,
    text,
    author,
    authorId,
    timestamp: Date.now(),
  }

  quotes.push(quote)
  saveQuotesToFile()
  logger.info(`Added quote #${newId} by ${author}`)

  return quote
}

/**
 * Gets a quote by ID
 * @param id The ID of the quote to get
 * @returns The quote, or undefined if not found
 */
export function getQuoteById(id: number): Quote | undefined {
  return quotes.find((q) => q.id === id)
}

/**
 * Gets a random quote
 * @returns A random quote, or undefined if no quotes exist
 */
export function getRandomQuote(): Quote | undefined {
  if (quotes.length === 0) return undefined
  return quotes[Math.floor(Math.random() * quotes.length)]
}

/**
 * Gets all quotes
 * @returns Array of all quotes
 */
export function getAllQuotes(): Quote[] {
  return [...quotes]
}

// Initialize quotes when the module is imported
initQuotes()