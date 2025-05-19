import type sqlite3 from "sqlite"
import { open } from "sqlite"
import { Database } from "sqlite3"
import path from "path"
import fs from "fs"
import { logger } from "./logger"

// Database connection
let db: sqlite3.Database | null = null

// Path to the database file
const DB_PATH = path.join(process.cwd(), "data", "bot.db")

/**
 * Ensures the data directory exists
 */
function ensureDataDirectory(): void {
  const dataDir = path.join(process.cwd(), "data")
  try {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true })
      logger.info(`Created data directory at ${dataDir}`)
    }
  } catch (error) {
    logger.error("Failed to create data directory:", error)
    throw error
  }
}

/**
 * Initializes the database connection
 */
export async function initDatabase(): Promise<void> {
  try {
    ensureDataDirectory()

    logger.info(`Opening database at ${DB_PATH}`)
    db = await open({
      filename: DB_PATH,
      driver: Database,
    })

    // Enable foreign keys
    await db.exec("PRAGMA foreign_keys = ON")

    // Set journal mode to WAL for better concurrency
    await db.exec("PRAGMA journal_mode = WAL")

    logger.info("Database connection established")

    // Initialize all tables
    await initTables()

    logger.info("Database tables initialized")
  } catch (error) {
    logger.error("Failed to initialize database:", error)
    throw error
  }
}

/**
 * Initializes all database tables
 */
async function initTables(): Promise<void> {
  try {
    // Create stats table
    await db?.exec(`
      CREATE TABLE IF NOT EXISTS stats (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )
    `)

    // Create blacklist table
    await db?.exec(`
  CREATE TABLE IF NOT EXISTS blacklisted_users (
    userId TEXT PRIMARY KEY,
    reason TEXT,
    blacklistedBy TEXT,
    timestamp INTEGER NOT NULL
  )
`)

    // Create maintenance_mode table
    await db?.exec(`
  CREATE TABLE IF NOT EXISTS bot_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )
`)

    // Create quotes table
    await db?.exec(`
      CREATE TABLE IF NOT EXISTS quotes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        text TEXT NOT NULL,
        author TEXT NOT NULL,
        author_id TEXT NOT NULL,
        timestamp INTEGER NOT NULL
      )
    `)

    // Create reputation tables
    await db?.exec(`
      CREATE TABLE IF NOT EXISTS reputation (
        user_id TEXT PRIMARY KEY,
        username TEXT NOT NULL,
        received_positive INTEGER NOT NULL DEFAULT 0,
        received_negative INTEGER NOT NULL DEFAULT 0,
        given_positive INTEGER NOT NULL DEFAULT 0,
        given_negative INTEGER NOT NULL DEFAULT 0,
        updated_at INTEGER NOT NULL
      )
    `)

    await db?.exec(`
      CREATE TABLE IF NOT EXISTS reputation_given (
        giver_id TEXT NOT NULL,
        receiver_id TEXT NOT NULL,
        is_positive INTEGER NOT NULL,
        timestamp INTEGER NOT NULL,
        PRIMARY KEY (giver_id, receiver_id)
      )
    `)

    // Create feedback table
    await db?.exec(`
      CREATE TABLE IF NOT EXISTS feedback (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        username TEXT NOT NULL,
        content TEXT NOT NULL,
        timestamp INTEGER NOT NULL
      )
    `)

    // Create RPS tables
    await db?.exec(`
  CREATE TABLE IF NOT EXISTS rps_players (
    userId TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    wins INTEGER NOT NULL DEFAULT 0,
    losses INTEGER NOT NULL DEFAULT 0,
    ties INTEGER NOT NULL DEFAULT 0,
    totalGames INTEGER NOT NULL DEFAULT 0,
    winRate REAL NOT NULL DEFAULT 0,
    lastPlayed INTEGER NOT NULL DEFAULT 0
  )
`)

    await db?.exec(`
  CREATE TABLE IF NOT EXISTS rps_games (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId TEXT NOT NULL,
    username TEXT NOT NULL,
    result TEXT NOT NULL,
    timestamp INTEGER NOT NULL
  )
`)

    // Create command_usage table
    await db?.exec(`
      CREATE TABLE IF NOT EXISTS command_usage (
        command_name TEXT PRIMARY KEY,
        count INTEGER NOT NULL DEFAULT 0
      )
    `)

    // Initialize maintenance mode if not exists
    const maintenanceExists = await db?.get("SELECT 1 FROM bot_settings WHERE key = 'maintenance_mode'")
    if (!maintenanceExists) {
      await db?.run("INSERT INTO bot_settings (key, value) VALUES ('maintenance_mode', '0')")
      await db?.run("INSERT INTO bot_settings (key, value) VALUES ('maintenance_updated_at', ?)", Date.now())
    }

    // Initialize stats if not exists
    const startTimeExists = await db?.get("SELECT 1 FROM stats WHERE key = 'start_time'")
    if (!startTimeExists) {
      await db?.run("INSERT INTO stats (key, value) VALUES ('start_time', ?)", Date.now().toString())
      await db?.run("INSERT INTO stats (key, value) VALUES ('total_commands', '0')")
      await db?.run("INSERT INTO stats (key, value) VALUES ('guild_count', '0')")
    }
  } catch (error) {
    logger.error("Failed to initialize tables:", error)
    throw error
  }
}

/**
 * Gets the database instance
 * @returns The database instance
 */
export function getDb(): sqlite3.Database {
  if (!db) {
    throw new Error("Database not initialized")
  }
  return db
}

/**
 * Closes the database connection
 */
export async function closeDatabase(): Promise<void> {
  try {
    if (db) {
      await db.close()
      db = null
      logger.info("Database connection closed")
    }
  } catch (error) {
    logger.error("Failed to close database:", error)
  }
}

// Handle process exit to close database connection
process.on("exit", () => {
  if (db) {
    logger.info("Process exiting, closing database connection")
    // Use sync method since we're in process.exit
    db.close()
  }
})

// Handle SIGINT (Ctrl+C)
process.on("SIGINT", async () => {
  logger.info("SIGINT received, closing database connection")
  await closeDatabase()
  process.exit(0)
})

// Handle SIGTERM
process.on("SIGTERM", async () => {
  logger.info("SIGTERM received, closing database connection")
  await closeDatabase()
  process.exit(0)
})