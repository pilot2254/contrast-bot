import sqlite3 from "sqlite3"
import { Logger } from "../utils/Logger"
import { config } from "../config/bot.config"
import fs from "fs/promises"
import path from "path"

// Define interfaces for table rows for better type safety
interface UserRow {
  user_id: string
  balance: number
  safe_balance: number
  safe_capacity: number
  safe_tier: number
  level: number
  xp: number
  total_commands: number
  last_daily: string | null
  last_weekly: string | null
  last_monthly: string | null
  last_yearly: string | null
  created_at: string
  updated_at: string
}

interface CommandStatsRow {
  command_name: string
  usage_count: number
  last_used: string
}

interface ErrorLogRow {
  id: number
  error_id: string
  message: string
  stack: string | null
  context: string | null // JSON string
  timestamp: string
}

interface ReputationRow {
  user_id: string
  given: number
  received: number
}

interface InventoryRow {
  user_id: string
  item_id: string
  quantity: number
  purchased_at: string
}

// Type for parameters in SQL queries
type SQLParams = (string | number | null | boolean)[]

export class Database {
  private db: sqlite3.Database | null = null
  private logger = new Logger()
  private dbPath: string
  private isInitialized = false

  constructor(dbPath: string) {
    this.dbPath = dbPath
  }

  getPath(): string {
    return this.dbPath
  }

  isReady(): boolean {
    return this.isInitialized && this.db !== null
  }

  async initialize(): Promise<void> {
    try {
      const dir = path.dirname(this.dbPath)
      await fs.mkdir(dir, { recursive: true })
      this.db = new sqlite3.Database(this.dbPath)
      await this.applyPragmaSettings()
      await this.createTables()
      await this.createIndexes()
      await this.run("PRAGMA optimize")
      this.isInitialized = true
      this.logger.success("Database initialized successfully")
    } catch (error) {
      this.logger.error("Database initialization failed:", error)
      throw error
    }
  }

  private async applyPragmaSettings(): Promise<void> {
    const { pragmaSettings } = config.database
    if (config.database.enableForeignKeys) {
      await this.run("PRAGMA foreign_keys = ON")
    }
    await this.run(`PRAGMA journal_mode = ${pragmaSettings.journalMode}`)
    await this.run(`PRAGMA synchronous = ${pragmaSettings.synchronous}`)
    await this.run(`PRAGMA cache_size = ${pragmaSettings.cacheSize}`)
    await this.run(`PRAGMA temp_store = ${pragmaSettings.tempStore}`)
    if (config.logging.logDatabase) {
      this.logger.debug("Applied database pragma settings:", pragmaSettings)
    }
  }

  private async createTables(): Promise<void> {
    const queries = [
      `CREATE TABLE IF NOT EXISTS users (
        user_id TEXT PRIMARY KEY, balance INTEGER DEFAULT ${config.economy.currency.startingBalance},
        safe_balance INTEGER DEFAULT 0, safe_capacity INTEGER DEFAULT ${config.economy.safe.baseCapacity},
        safe_tier INTEGER DEFAULT 1, level INTEGER DEFAULT 1, xp INTEGER DEFAULT 0,
        total_commands INTEGER DEFAULT 0, last_daily TIMESTAMP NULL, last_weekly TIMESTAMP NULL,
        last_monthly TIMESTAMP NULL, last_yearly TIMESTAMP NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS claims (
        user_id TEXT, claim_type TEXT, last_claimed TIMESTAMP, streak INTEGER DEFAULT 0,
        PRIMARY KEY (user_id, claim_type), FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
      )`,
      `CREATE TABLE IF NOT EXISTS cooldowns (
        user_id TEXT, command TEXT, expires_at TIMESTAMP,
        PRIMARY KEY (user_id, command), FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
      )`,
      `CREATE TABLE IF NOT EXISTS inventory (
        user_id TEXT, item_id TEXT, quantity INTEGER DEFAULT 1, purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, item_id), FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
      )`,
      `CREATE TABLE IF NOT EXISTS reputation (
        user_id TEXT PRIMARY KEY, given INTEGER DEFAULT 0, received INTEGER DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
      )`,
      `CREATE TABLE IF NOT EXISTS reputation_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT, giver_id TEXT, receiver_id TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (giver_id) REFERENCES users(user_id) ON DELETE CASCADE,
        FOREIGN KEY (receiver_id) REFERENCES users(user_id) ON DELETE CASCADE
      )`,
      `CREATE TABLE IF NOT EXISTS command_stats (
        command_name TEXT PRIMARY KEY, usage_count INTEGER DEFAULT 0,
        last_used TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS blacklist (
        user_id TEXT PRIMARY KEY, reason TEXT, blacklisted_by TEXT,
        blacklisted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT, type TEXT, amount INTEGER,
        description TEXT, metadata TEXT, timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
      )`,
      `CREATE TABLE IF NOT EXISTS error_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT, error_id TEXT UNIQUE, message TEXT, stack TEXT,
        context TEXT, timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS rate_limits (
        user_id TEXT, action_type TEXT, count INTEGER DEFAULT 1,
        window_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (user_id, action_type)
      )`,
      `CREATE TABLE IF NOT EXISTS guild_settings (
        guild_id TEXT PRIMARY KEY, settings TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
    ]
    for (const query of queries) {
      await this.run(query)
    }
    if (config.logging.logDatabase) {
      this.logger.debug(`Created ${queries.length} database tables`)
    }
  }

  private async createIndexes(): Promise<void> {
    const indexes = [
      `CREATE INDEX IF NOT EXISTS idx_users_balance ON users(balance DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_users_level ON users(level DESC, xp DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_users_updated ON users(updated_at)`,
      `CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type)`,
      `CREATE INDEX IF NOT EXISTS idx_transactions_timestamp ON transactions(timestamp DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_reputation_received ON reputation(received DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_reputation_given ON reputation(given DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_reputation_logs_timestamp ON reputation_logs(timestamp DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_cooldowns_expires ON cooldowns(expires_at)`,
      `CREATE INDEX IF NOT EXISTS idx_cooldowns_user_command ON cooldowns(user_id, command)`,
      `CREATE INDEX IF NOT EXISTS idx_claims_type_user ON claims(claim_type, user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_claims_last_claimed ON claims(last_claimed)`,
      `CREATE INDEX IF NOT EXISTS idx_command_stats_usage ON command_stats(usage_count DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_command_stats_last_used ON command_stats(last_used DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_error_logs_timestamp ON error_logs(timestamp DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_error_logs_error_id ON error_logs(error_id)`,
      `CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON rate_limits(window_start)`,
    ]
    for (const index of indexes) {
      await this.run(index)
    }
    if (config.logging.logDatabase) {
      this.logger.debug(`Created ${indexes.length} database indexes`)
    }
  }

  async run(sql: string, params: SQLParams = []): Promise<sqlite3.RunResult> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error("Database not initialized"))
        return
      }
      this.db.run(sql, params, function (err) {
        if (err) reject(new Error(`Database run error: ${err.message}`))
        else resolve(this)
      })
    })
  }

  async get<T = Record<string, unknown>>(sql: string, params: SQLParams = []): Promise<T | undefined> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error("Database not initialized"))
        return
      }
      this.db.get(sql, params, (err, row) => {
        if (err) reject(new Error(`Database get error: ${err.message}`))
        else resolve(row as T | undefined)
      })
    })
  }

  async all<T = Record<string, unknown>>(sql: string, params: SQLParams = []): Promise<T[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error("Database not initialized"))
        return
      }
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(new Error(`Database all error: ${err.message}`))
        else resolve((rows || []) as T[])
      })
    })
  }

  async exec(sql: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error("Database not initialized"))
        return
      }
      this.db.exec(sql, (err) => {
        if (err) reject(new Error(`Database exec error: ${err.message}`))
        else resolve()
      })
    })
  }

  async beginTransaction(): Promise<void> {
    await this.run("BEGIN TRANSACTION")
  }
  async commitTransaction(): Promise<void> {
    await this.run("COMMIT")
  }
  async rollbackTransaction(): Promise<void> {
    await this.run("ROLLBACK")
  }

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

  async close(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) reject(new Error(`Database close error: ${err.message}`))
          else {
            this.db = null
            this.isInitialized = false
            resolve()
          }
        })
      } else resolve()
    })
  }

  async createUser(userId: string): Promise<void> {
    try {
      await this.run("INSERT OR IGNORE INTO users (user_id) VALUES (?)", [userId])
    } catch (error) {
      throw new Error(`Failed to create user ${userId}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  async getUser(userId: string): Promise<UserRow> {
    try {
      await this.createUser(userId)
      const user = await this.get<UserRow>("SELECT * FROM users WHERE user_id = ?", [userId])
      if (!user) throw new Error(`User ${userId} not found after creation attempt.`)
      return user
    } catch (error) {
      throw new Error(`Failed to get user ${userId}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  async updateUser(
    userId: string,
    updates: Partial<Omit<UserRow, "user_id" | "created_at" | "updated_at">>,
  ): Promise<void> {
    try {
      const fields = Object.keys(updates)
        .map((key) => `${key} = ?`)
        .join(", ")
      const values = Object.values(updates)
      if (fields.length === 0) return // No updates to apply

      await this.run(`UPDATE users SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?`, [
        ...values,
        userId,
      ])
    } catch (error) {
      throw new Error(`Failed to update user ${userId}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  async logTransaction(
    userId: string,
    type: string,
    amount: number,
    description: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    try {
      const metadataJson = metadata ? JSON.stringify(metadata) : null
      await this.run("INSERT INTO transactions (user_id, type, amount, description, metadata) VALUES (?, ?, ?, ?, ?)", [
        userId,
        type,
        amount,
        description,
        metadataJson,
      ])
    } catch (error) {
      throw new Error(
        `Failed to log transaction for user ${userId}: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  async incrementCommandUsage(commandName: string): Promise<void> {
    try {
      await this.run(
        `INSERT INTO command_stats (command_name, usage_count) VALUES (?, 1) 
         ON CONFLICT(command_name) DO UPDATE SET usage_count = usage_count + 1, last_used = CURRENT_TIMESTAMP`,
        [commandName],
      )
    } catch (error) {
      throw new Error(
        `Failed to increment command usage for ${commandName}: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  async cleanupExpiredData(): Promise<void> {
    try {
      const now = new Date().toISOString() // Use ISO string for SQLite date functions
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

      await this.run("DELETE FROM cooldowns WHERE expires_at < ?", [now])
      await this.run("DELETE FROM rate_limits WHERE window_start < ?", [oneHourAgo])
      await this.run("DELETE FROM error_logs WHERE timestamp < ?", [thirtyDaysAgo])

      if (config.logging.logDatabase) {
        this.logger.debug("Cleaned up expired database data")
      }
    } catch (error) {
      this.logger.error("Failed to cleanup expired data:", error)
    }
  }

  async getStatistics(): Promise<Record<string, number | string>> {
    try {
      const stats: Record<string, number | string> = {}
      const tables = ["users", "transactions", "command_stats", "error_logs", "reputation", "inventory"]
      for (const table of tables) {
        const result = await this.get<{ count: number }>(`SELECT COUNT(*) as count FROM ${table}`)
        stats[`${table}_count`] = result?.count ?? 0
      }
      try {
        const dbStats = await fs.stat(this.dbPath)
        stats.database_size_mb = (dbStats.size / (1024 * 1024)).toFixed(2)
      } catch {
        stats.database_size_mb = "Unknown"
      }
      return stats
    } catch (error) {
      throw new Error(`Failed to get database statistics: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
}
