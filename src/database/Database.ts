import sqlite3 from "sqlite3"
import { config } from "../config/bot.config"
import path from "path"
import fs from "fs/promises"

interface UserRecord {
  user_id: string
  balance: number
  safe_balance: number
  safe_capacity: number
  safe_tier: number
  level: number
  xp: number
  total_commands: number
  created_at: string
  updated_at: string
}

interface TransactionRecord {
  id: number
  user_id: string
  type: "add" | "remove" | "deposit" | "withdraw" | "xp" | "xp_gain"
  amount: number
  reason: string
  timestamp: string
}

export class Database {
  private db: sqlite3.Database | null = null
  private dbPath: string

  constructor(dbPath: string) {
    this.dbPath = dbPath
  }

  async initialize(): Promise<void> {
    // Ensure directory exists
    const dir = path.dirname(this.dbPath)
    await fs.mkdir(dir, { recursive: true })

    // Create database connection
    this.db = new sqlite3.Database(this.dbPath)

    // Configure database
    await this.configurePragmas()

    // Create tables
    await this.createTables()

    // Create indexes for performance
    await this.createIndexes()
  }

  private async configurePragmas(): Promise<void> {
    if (!this.db) throw new Error("Database not initialized")

    const pragmas = [
      `PRAGMA synchronous = ${config.database.pragmaSettings.synchronous}`,
      `PRAGMA journal_mode = ${config.database.pragmaSettings.journalMode}`,
      `PRAGMA cache_size = ${config.database.pragmaSettings.cacheSize}`,
      `PRAGMA temp_store = ${config.database.pragmaSettings.tempStore}`,
      `PRAGMA foreign_keys = ${config.database.enableForeignKeys ? "ON" : "OFF"}`,
    ]

    for (const pragma of pragmas) {
      await this.run(pragma)
    }
  }

  private async createTables(): Promise<void> {
    const tables = [
      // Users table
      `CREATE TABLE IF NOT EXISTS users (
        user_id TEXT PRIMARY KEY,
        balance INTEGER DEFAULT ${config.economy.currency.startingBalance},
        safe_balance INTEGER DEFAULT 0,
        safe_capacity INTEGER DEFAULT ${config.economy.safe.baseCapacity},
        safe_tier INTEGER DEFAULT 1,
        level INTEGER DEFAULT 1,
        xp INTEGER DEFAULT 0,
        total_commands INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Transactions table
      `CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        type TEXT NOT NULL,
        amount INTEGER NOT NULL,
        reason TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(user_id)
      )`,

      // Claims table (daily, weekly, monthly, yearly)
      `CREATE TABLE IF NOT EXISTS claims (
        user_id TEXT NOT NULL,
        claim_type TEXT NOT NULL,
        last_claimed DATETIME NOT NULL,
        streak INTEGER DEFAULT 1,
        PRIMARY KEY (user_id, claim_type),
        FOREIGN KEY (user_id) REFERENCES users(user_id)
      )`,

      // Cooldowns table
      `CREATE TABLE IF NOT EXISTS cooldowns (
        user_id TEXT NOT NULL,
        command TEXT NOT NULL,
        expires_at DATETIME NOT NULL,
        PRIMARY KEY (user_id, command),
        FOREIGN KEY (user_id) REFERENCES users(user_id)
      )`,

      // Command statistics
      `CREATE TABLE IF NOT EXISTS command_stats (
        command_name TEXT PRIMARY KEY,
        usage_count INTEGER DEFAULT 0
      )`,

      // Error logs
      `CREATE TABLE IF NOT EXISTS error_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        error_id TEXT NOT NULL,
        message TEXT NOT NULL,
        stack TEXT,
        context TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Blacklist
      `CREATE TABLE IF NOT EXISTS blacklist (
        user_id TEXT PRIMARY KEY,
        reason TEXT NOT NULL,
        blacklisted_by TEXT NOT NULL,
        blacklisted_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Reputation system
      `CREATE TABLE IF NOT EXISTS reputation (
        user_id TEXT PRIMARY KEY,
        given INTEGER DEFAULT 0,
        received INTEGER DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES users(user_id)
      )`,

      // Reputation logs
      `CREATE TABLE IF NOT EXISTS reputation_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        giver_id TEXT NOT NULL,
        receiver_id TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (giver_id) REFERENCES users(user_id),
        FOREIGN KEY (receiver_id) REFERENCES users(user_id)
      )`,

      // Inventory
      `CREATE TABLE IF NOT EXISTS inventory (
        user_id TEXT NOT NULL,
        item_id TEXT NOT NULL,
        quantity INTEGER DEFAULT 1,
        purchased_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, item_id),
        FOREIGN KEY (user_id) REFERENCES users(user_id)
      )`,
    ]

    for (const table of tables) {
      await this.run(table)
    }
  }

  private async createIndexes(): Promise<void> {
    const indexes = [
      "CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id)",
      "CREATE INDEX IF NOT EXISTS idx_transactions_timestamp ON transactions(timestamp)",
      "CREATE INDEX IF NOT EXISTS idx_claims_user_type ON claims(user_id, claim_type)",
      "CREATE INDEX IF NOT EXISTS idx_cooldowns_expires ON cooldowns(expires_at)",
      "CREATE INDEX IF NOT EXISTS idx_reputation_logs_giver ON reputation_logs(giver_id)",
      "CREATE INDEX IF NOT EXISTS idx_reputation_logs_receiver ON reputation_logs(receiver_id)",
      "CREATE INDEX IF NOT EXISTS idx_users_level ON users(level DESC)",
      "CREATE INDEX IF NOT EXISTS idx_users_balance ON users(balance DESC)",
    ]

    for (const index of indexes) {
      await this.run(index)
    }
  }

  // Core database methods
  async run(sql: string, params: any[] = []): Promise<void> {
    if (!this.db) throw new Error("Database not initialized")

    return new Promise((resolve, reject) => {
      this.db!.run(sql, params, (err) => {
        if (err) reject(err)
        else resolve()
      })
    })
  }

  async get<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
    if (!this.db) throw new Error("Database not initialized")

    return new Promise((resolve, reject) => {
      this.db!.get(sql, params, (err, row) => {
        if (err) reject(err)
        else resolve(row as T)
      })
    })
  }

  async all<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    if (!this.db) throw new Error("Database not initialized")

    return new Promise((resolve, reject) => {
      this.db!.all(sql, params, (err, rows) => {
        if (err) reject(err)
        else resolve(rows as T[])
      })
    })
  }

  // Transaction wrapper
  async transaction<T>(callback: () => Promise<T>): Promise<T> {
    await this.run("BEGIN TRANSACTION")
    try {
      const result = await callback()
      await this.run("COMMIT")
      return result
    } catch (error) {
      await this.run("ROLLBACK")
      throw error
    }
  }

  // User management
  async createUser(userId: string): Promise<void> {
    await this.run(`INSERT OR IGNORE INTO users (user_id) VALUES (?)`, [userId])
  }

  async getUser(userId: string): Promise<UserRecord> {
    await this.createUser(userId)
    const user = await this.get<UserRecord>(
      "SELECT * FROM users WHERE user_id = ?",
      [userId]
    )
    if (!user) throw new Error("User not found after creation")
    return user
  }

  async updateUser(
    userId: string,
    updates: Partial<Omit<UserRecord, "user_id" | "created_at">>
  ): Promise<void> {
    const fields = Object.keys(updates)
    const values = Object.values(updates)

    if (fields.length === 0) return

    const setClause = fields.map((field) => `${field} = ?`).join(", ")
    const sql = `UPDATE users SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?`

    await this.run(sql, [...values, userId])
  }

  // Transaction logging
  async logTransaction(
    userId: string,
    type: TransactionRecord["type"],
    amount: number,
    reason: string
  ): Promise<void> {
    await this.run(
      "INSERT INTO transactions (user_id, type, amount, reason) VALUES (?, ?, ?, ?)",
      [userId, type, amount, reason]
    )
  }

  // Command statistics
  async incrementCommandUsage(commandName: string): Promise<void> {
    await this.run(
      `INSERT INTO command_stats (command_name, usage_count) VALUES (?, 1)
       ON CONFLICT(command_name) DO UPDATE SET usage_count = usage_count + 1`,
      [commandName]
    )
  }

  // Cleanup expired cooldowns
  async cleanupExpiredCooldowns(): Promise<void> {
    await this.run(
      "DELETE FROM cooldowns WHERE expires_at <= CURRENT_TIMESTAMP"
    )
  }

  async close(): Promise<void> {
    if (!this.db) return

    return new Promise((resolve, reject) => {
      this.db!.close((err) => {
        if (err) reject(err)
        else {
          this.db = null
          resolve()
        }
      })
    })
  }
}
