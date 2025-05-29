import sqlite3 from "sqlite3"
import { Logger } from "../utils/Logger"
import fs from "fs/promises"
import path from "path"

export class Database {
  private db: sqlite3.Database | null = null
  private logger = new Logger()
  private dbPath: string

  constructor(dbPath: string) {
    this.dbPath = dbPath
  }

  /**
   * Get the database file path
   */
  getPath(): string {
    return this.dbPath
  }

  /**
   * Initialize the database connection and create tables
   */
  async initialize(): Promise<void> {
    try {
      // Ensure data directory exists
      const dir = path.dirname(this.dbPath)
      await fs.mkdir(dir, { recursive: true })

      // Open database connection
      this.db = new sqlite3.Database(this.dbPath)

      // Enable foreign keys
      await this.run("PRAGMA foreign_keys = ON")

      // Enable WAL mode for better performance
      await this.run("PRAGMA journal_mode = WAL")

      // Set synchronous mode to NORMAL for better performance
      await this.run("PRAGMA synchronous = NORMAL")

      // Create tables
      await this.createTables()

      // Optimize database
      await this.run("PRAGMA optimize")
    } catch (error) {
      this.logger.error("Database initialization failed:", error)
      throw error
    }
  }

  /**
   * Create database tables if they don't exist
   */
  private async createTables(): Promise<void> {
    const queries = [
      // Users table
      `CREATE TABLE IF NOT EXISTS users (
        user_id TEXT PRIMARY KEY,
        balance INTEGER DEFAULT 1000,
        safe_balance INTEGER DEFAULT 0,
        safe_capacity INTEGER DEFAULT 10000,
        safe_tier INTEGER DEFAULT 1,
        level INTEGER DEFAULT 1,
        xp INTEGER DEFAULT 0,
        total_commands INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      // Daily/Weekly/Monthly/Yearly claims
      `CREATE TABLE IF NOT EXISTS claims (
        user_id TEXT,
        claim_type TEXT,
        last_claimed TIMESTAMP,
        streak INTEGER DEFAULT 0,
        PRIMARY KEY (user_id, claim_type),
        FOREIGN KEY (user_id) REFERENCES users(user_id)
      )`,

      // Work cooldowns
      `CREATE TABLE IF NOT EXISTS cooldowns (
        user_id TEXT,
        command TEXT,
        expires_at TIMESTAMP,
        PRIMARY KEY (user_id, command),
        FOREIGN KEY (user_id) REFERENCES users(user_id)
      )`,

      // Inventory
      `CREATE TABLE IF NOT EXISTS inventory (
        user_id TEXT,
        item_id TEXT,
        quantity INTEGER DEFAULT 1,
        purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, item_id),
        FOREIGN KEY (user_id) REFERENCES users(user_id)
      )`,

      // Reputation
      `CREATE TABLE IF NOT EXISTS reputation (
        user_id TEXT PRIMARY KEY,
        given INTEGER DEFAULT 0,
        received INTEGER DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES users(user_id)
      )`,

      // Reputation logs
      `CREATE TABLE IF NOT EXISTS reputation_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        giver_id TEXT,
        receiver_id TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (giver_id) REFERENCES users(user_id),
        FOREIGN KEY (receiver_id) REFERENCES users(user_id)
      )`,

      // Command usage statistics
      `CREATE TABLE IF NOT EXISTS command_stats (
        command_name TEXT PRIMARY KEY,
        usage_count INTEGER DEFAULT 0,
        last_used TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      // Blacklist
      `CREATE TABLE IF NOT EXISTS blacklist (
        user_id TEXT PRIMARY KEY,
        reason TEXT,
        blacklisted_by TEXT,
        blacklisted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      // Transactions log
      `CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        type TEXT,
        amount INTEGER,
        description TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(user_id)
      )`,

      // Create indexes for better performance
      `CREATE INDEX IF NOT EXISTS idx_users_balance ON users(balance)`,
      `CREATE INDEX IF NOT EXISTS idx_users_level ON users(level)`,
      `CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_reputation_received ON reputation(received)`,
      `CREATE INDEX IF NOT EXISTS idx_cooldowns_expires ON cooldowns(expires_at)`,
      `CREATE INDEX IF NOT EXISTS idx_claims_type_user ON claims(claim_type, user_id)`,
    ]

    for (const query of queries) {
      await this.run(query)
    }
  }

  // Promisified database methods
  async run(sql: string, params: any[] = []): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db!.run(sql, params, (err) => {
        if (err) reject(err)
        else resolve()
      })
    })
  }

  async get(sql: string, params: any[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
      this.db!.get(sql, params, (err, row) => {
        if (err) reject(err)
        else resolve(row)
      })
    })
  }

  async all(sql: string, params: any[] = []): Promise<any[]> {
    return new Promise((resolve, reject) => {
      this.db!.all(sql, params, (err, rows) => {
        if (err) reject(err)
        else resolve(rows)
      })
    })
  }

  async exec(sql: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db!.exec(sql, (err) => {
        if (err) reject(err)
        else resolve()
      })
    })
  }

  /**
   * Begin a transaction
   */
  async beginTransaction(): Promise<void> {
    await this.run("BEGIN TRANSACTION")
  }

  /**
   * Commit a transaction
   */
  async commitTransaction(): Promise<void> {
    await this.run("COMMIT")
  }

  /**
   * Rollback a transaction
   */
  async rollbackTransaction(): Promise<void> {
    await this.run("ROLLBACK")
  }

  /**
   * Execute a function within a transaction
   */
  async transaction<T>(callback: () => Promise<T>): Promise<T> {
    await this.beginTransaction()
    try {
      const result = await callback()
      await this.commitTransaction()
      return result
    } catch (error) {
      await this.rollbackTransaction()
      throw error
    }
  }

  /**
   * Close the database connection
   */
  async close(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) reject(err)
          else {
            this.db = null
            resolve()
          }
        })
      } else {
        resolve()
      }
    })
  }

  // User management methods
  async createUser(userId: string): Promise<void> {
    await this.run("INSERT OR IGNORE INTO users (user_id) VALUES (?)", [userId])
  }

  async getUser(userId: string): Promise<any> {
    await this.createUser(userId) // Ensure user exists
    return this.get("SELECT * FROM users WHERE user_id = ?", [userId])
  }

  async updateUser(userId: string, updates: Record<string, any>): Promise<void> {
    const fields = Object.keys(updates)
      .map((key) => `${key} = ?`)
      .join(", ")
    const values = Object.values(updates)

    await this.run(`UPDATE users SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?`, [...values, userId])
  }

  // Transaction logging
  async logTransaction(userId: string, type: string, amount: number, description: string): Promise<void> {
    await this.run("INSERT INTO transactions (user_id, type, amount, description) VALUES (?, ?, ?, ?)", [
      userId,
      type,
      amount,
      description,
    ])
  }

  // Command statistics
  async incrementCommandUsage(commandName: string): Promise<void> {
    await this.run(
      `INSERT INTO command_stats (command_name, usage_count) 
       VALUES (?, 1) 
       ON CONFLICT(command_name) 
       DO UPDATE SET usage_count = usage_count + 1, last_used = CURRENT_TIMESTAMP`,
      [commandName],
    )
  }
}
