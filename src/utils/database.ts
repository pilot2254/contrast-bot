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

// Ensure data directory exists
function ensureDataDirectory(): void {
  const dataDir = path.join(process.cwd(), "data")
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
    logger.info(`Created data directory at ${dataDir}`)
  }
}

// Initialize database connection
export async function initDatabase(): Promise<void> {
  try {
    ensureDataDirectory()

    logger.info(`Opening database at ${DB_PATH}`)
    db = await open({
      filename: DB_PATH,
      driver: Database,
    })

    // Enable foreign keys and set journal mode
    await db.exec("PRAGMA foreign_keys = ON")
    await db.exec("PRAGMA journal_mode = WAL")

    // Initialize tables
    await initTables()
    logger.info("Database initialized successfully")
  } catch (error) {
    logger.error("Failed to initialize database:", error)
    throw error
  }
}

// Initialize all database tables
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

    // Create bot settings table
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

    // Create economy tables
    await db?.exec(`
      CREATE TABLE IF NOT EXISTS user_economy (
        user_id TEXT PRIMARY KEY,
        username TEXT NOT NULL,
        balance INTEGER NOT NULL DEFAULT 0,
        total_earned INTEGER NOT NULL DEFAULT 0,
        total_spent INTEGER NOT NULL DEFAULT 0,
        last_daily INTEGER NOT NULL DEFAULT 0,
        daily_streak INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL DEFAULT 0,
        updated_at INTEGER NOT NULL DEFAULT 0
      )
    `)

    await db?.exec(`
      CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        type TEXT NOT NULL,
        amount INTEGER NOT NULL,
        description TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        related_user_id TEXT,
        FOREIGN KEY (user_id) REFERENCES user_economy (user_id)
      )
    `)

    await db?.exec(`
      CREATE TABLE IF NOT EXISTS gambling_stats (
        user_id TEXT PRIMARY KEY,
        total_bet INTEGER NOT NULL DEFAULT 0,
        total_won INTEGER NOT NULL DEFAULT 0,
        total_lost INTEGER NOT NULL DEFAULT 0,
        games_played INTEGER NOT NULL DEFAULT 0,
        biggest_win INTEGER NOT NULL DEFAULT 0,
        updated_at INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES user_economy (user_id)
      )
    `)

    // Initialize default values
    await initDefaultValues()
  } catch (error) {
    logger.error("Failed to initialize tables:", error)
    throw error
  }
}

// Initialize default values in the database
async function initDefaultValues(): Promise<void> {
  try {
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
    logger.error("Failed to initialize default values:", error)
  }
}

// Get database instance
export function getDb(): sqlite3.Database {
  if (!db) {
    throw new Error("Database not initialized")
  }
  return db
}

// Close database connection
export async function closeDatabase(): Promise<void> {
  if (db) {
    await db.close()
    db = null
    logger.info("Database connection closed")
  }
}

// Handle process exit events
process.on("exit", () => {
  if (db) {
    logger.info("Process exiting, closing database connection")
    db.close()
  }
})

process.on("SIGINT", async () => {
  logger.info("SIGINT received, closing database connection")
  await closeDatabase()
  process.exit(0)
})

process.on("SIGTERM", async () => {
  logger.info("SIGTERM received, closing database connection")
  await closeDatabase()
  process.exit(0)
})

/**
 * Retrieves all shop items from the database.
 * @returns A promise that resolves to an array of shop items.
 */
export async function getAllShopItems(): Promise<any[]> {
  try {
    const db = getDb()
    const items = await db.all("SELECT * FROM shop_items")
    return items
  } catch (error) {
    logger.error("Failed to retrieve shop items:", error)
    throw error
  }
}
