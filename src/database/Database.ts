import sqlite3 from "sqlite3"
import { Logger } from "../utils/Logger"
import { config } from "../config/bot.config"
import fs from "fs/promises"
import path from "path"

export class Database {
  private db: sqlite3.Database | null = null
  private logger = new Logger()
  private dbPath: string
  private isInitialized = false

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
   * Check if database is initialized
   */
  isReady(): boolean {
    return this.isInitialized && this.db !== null
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

      // Apply pragma settings from config
      await this.applyPragmaSettings()

      // Create tables
      await this.createTables()

      // Create indexes for performance
      await this.createIndexes()

      // Optimize database
      await this.run("PRAGMA optimize")

      this.isInitialized = true
      this.logger.success("Database initialized successfully")
    } catch (error) {
      this.logger.error("Database initialization failed:", error)
      throw error
    }
  }

  /**
   * Apply pragma settings from configuration
   */
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

  /**
   * Create database tables if they don't exist
   */
  private async createTables(): Promise<void> {
    const queries = [
      // Users table with comprehensive fields
      `CREATE TABLE IF NOT EXISTS users (
        user_id TEXT PRIMARY KEY,
        balance INTEGER DEFAULT ${config.economy.currency.startingBalance},
        safe_balance INTEGER DEFAULT 0,
        safe_capacity INTEGER DEFAULT ${config.economy.safe.baseCapacity},
        safe_tier INTEGER DEFAULT 1,
        level INTEGER DEFAULT 1,
        xp INTEGER DEFAULT 0,
        total_commands INTEGER DEFAULT 0,
        last_daily TIMESTAMP NULL,
        last_weekly TIMESTAMP NULL,
        last_monthly TIMESTAMP NULL,
        last_yearly TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      // Claims table for time-based rewards
      `CREATE TABLE IF NOT EXISTS claims (
        user_id TEXT,
        claim_type TEXT,
        last_claimed TIMESTAMP,
        streak INTEGER DEFAULT 0,
        PRIMARY KEY (user_id, claim_type),
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
      )`,

      // Cooldowns table for command rate limiting
      `CREATE TABLE IF NOT EXISTS cooldowns (
        user_id TEXT,
        command TEXT,
        expires_at TIMESTAMP,
        PRIMARY KEY (user_id, command),
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
      )`,

      // Inventory table for shop items
      `CREATE TABLE IF NOT EXISTS inventory (
        user_id TEXT,
        item_id TEXT,
        quantity INTEGER DEFAULT 1,
        purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, item_id),
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
      )`,

      // Reputation system
      `CREATE TABLE IF NOT EXISTS reputation (
        user_id TEXT PRIMARY KEY,
        given INTEGER DEFAULT 0,
        received INTEGER DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
      )`,

      // Reputation logs for tracking
      `CREATE TABLE IF NOT EXISTS reputation_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        giver_id TEXT,
        receiver_id TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (giver_id) REFERENCES users(user_id) ON DELETE CASCADE,
        FOREIGN KEY (receiver_id) REFERENCES users(user_id) ON DELETE CASCADE
      )`,

      // Command usage statistics
      `CREATE TABLE IF NOT EXISTS command_stats (
        command_name TEXT PRIMARY KEY,
        usage_count INTEGER DEFAULT 0,
        last_used TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      // Blacklist system
      `CREATE TABLE IF NOT EXISTS blacklist (
        user_id TEXT PRIMARY KEY,
        reason TEXT,
        blacklisted_by TEXT,
        blacklisted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      // Comprehensive transaction log
      `CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        type TEXT,
        amount INTEGER,
        description TEXT,
        metadata TEXT, -- JSON string for additional data
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
      )`,

      // Error logging table
      `CREATE TABLE IF NOT EXISTS error_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        error_id TEXT UNIQUE,
        message TEXT,
        stack TEXT,
        context TEXT, -- JSON string
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      // Rate limiting table
      `CREATE TABLE IF NOT EXISTS rate_limits (
        user_id TEXT,
        action_type TEXT,
        count INTEGER DEFAULT 1,
        window_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, action_type)
      )`,

      // Guild settings table
      `CREATE TABLE IF NOT EXISTS guild_settings (
        guild_id TEXT PRIMARY KEY,
        settings TEXT, -- JSON string for guild-specific settings
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
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

  /**
   * Create database indexes for performance optimization
   */
  private async createIndexes(): Promise<void> {
    const indexes = [
      // Performance indexes
      `CREATE INDEX IF NOT EXISTS idx_users_balance ON users(balance DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_users_level ON users(level DESC, xp DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_users_updated ON users(updated_at)`,

      // Transaction indexes
      `CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type)`,
      `CREATE INDEX IF NOT EXISTS idx_transactions_timestamp ON transactions(timestamp DESC)`,

      // Reputation indexes
      `CREATE INDEX IF NOT EXISTS idx_reputation_received ON reputation(received DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_reputation_given ON reputation(given DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_reputation_logs_timestamp ON reputation_logs(timestamp DESC)`,

      // Cooldown indexes
      `CREATE INDEX IF NOT EXISTS idx_cooldowns_expires ON cooldowns(expires_at)`,
      `CREATE INDEX IF NOT EXISTS idx_cooldowns_user_command ON cooldowns(user_id, command)`,

      // Claims indexes
      `CREATE INDEX IF NOT EXISTS idx_claims_type_user ON claims(claim_type, user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_claims_last_claimed ON claims(last_claimed)`,

      // Command stats indexes
      `CREATE INDEX IF NOT EXISTS idx_command_stats_usage ON command_stats(usage_count DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_command_stats_last_used ON command_stats(last_used DESC)`,

      // Error logs indexes
      `CREATE INDEX IF NOT EXISTS idx_error_logs_timestamp ON error_logs(timestamp DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_error_logs_error_id ON error_logs(error_id)`,

      // Rate limit indexes
      `CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON rate_limits(window_start)`,
    ]

    for (const index of indexes) {
      await this.run(index)
    }

    if (config.logging.logDatabase) {
      this.logger.debug(`Created ${indexes.length} database indexes`)
    }
  }

  // Enhanced promisified database methods with better error handling
  async run(sql: string, params: any[] = []): Promise<sqlite3.RunResult> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error("Database not initialized"))
        return
      }

      this.db.run(sql, params, function (err) {
        if (err) {
          reject(new Error(`Database run error: ${err.message}`))
        } else {
          resolve(this)
        }
      })
    })
  }

  async get(sql: string, params: any[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error("Database not initialized"))
        return
      }

      this.db.get(sql, params, (err, row) => {
        if (err) {
          reject(new Error(`Database get error: ${err.message}`))
        } else {
          resolve(row)
        }
      })
    })
  }

  async all(sql: string, params: any[] = []): Promise<any[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error("Database not initialized"))
        return
      }

      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(new Error(`Database all error: ${err.message}`))
        } else {
          resolve(rows || [])
        }
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
        if (err) {
          reject(new Error(`Database exec error: ${err.message}`))
        } else {
          resolve()
        }
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
   * Execute a function within a transaction with automatic rollback on error
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
   * Close the database connection gracefully
   */
  async close(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) {
            reject(new Error(`Database close error: ${err.message}`))
          } else {
            this.db = null
            this.isInitialized = false
            resolve()
          }
        })
      } else {
        resolve()
      }
    })
  }

  // Enhanced user management methods
  async createUser(userId: string): Promise<void> {
    try {
      await this.run("INSERT OR IGNORE INTO users (user_id) VALUES (?)", [userId])
    } catch (error) {
      throw new Error(`Failed to create user ${userId}: ${error}`)
    }
  }

  async getUser(userId: string): Promise<any> {
    try {
      await this.createUser(userId) // Ensure user exists
      const user = await this.get("SELECT * FROM users WHERE user_id = ?", [userId])
      if (!user) {
        throw new Error(`User ${userId} not found after creation`)
      }
      return user
    } catch (error) {
      throw new Error(`Failed to get user ${userId}: ${error}`)
    }
  }

  async updateUser(userId: string, updates: Record<string, any>): Promise<void> {
    try {
      const fields = Object.keys(updates)
        .map((key) => `${key} = ?`)
        .join(", ")
      const values = Object.values(updates)

      await this.run(`UPDATE users SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?`, [
        ...values,
        userId,
      ])
    } catch (error) {
      throw new Error(`Failed to update user ${userId}: ${error}`)
    }
  }

  // Enhanced transaction logging with metadata support
  async logTransaction(
    userId: string,
    type: string,
    amount: number,
    description: string,
    metadata?: Record<string, any>,
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
      throw new Error(`Failed to log transaction for user ${userId}: ${error}`)
    }
  }

  // Enhanced command statistics
  async incrementCommandUsage(commandName: string): Promise<void> {
    try {
      await this.run(
        `INSERT INTO command_stats (command_name, usage_count) 
         VALUES (?, 1) 
         ON CONFLICT(command_name) 
         DO UPDATE SET usage_count = usage_count + 1, last_used = CURRENT_TIMESTAMP`,
        [commandName],
      )
    } catch (error) {
      throw new Error(`Failed to increment command usage for ${commandName}: ${error}`)
    }
  }

  /**
   * Clean up expired data (cooldowns, rate limits, etc.)
   */
  async cleanupExpiredData(): Promise<void> {
    try {
      const now = Date.now()

      // Clean expired cooldowns
      await this.run("DELETE FROM cooldowns WHERE expires_at < ?", [now])

      // Clean old rate limit entries (older than 1 hour)
      await this.run("DELETE FROM rate_limits WHERE window_start < ?", [now - 60 * 60 * 1000])

      // Clean old error logs (older than 30 days)
      const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString()
      await this.run("DELETE FROM error_logs WHERE timestamp < ?", [thirtyDaysAgo])

      if (config.logging.logDatabase) {
        this.logger.debug("Cleaned up expired database data")
      }
    } catch (error) {
      this.logger.error("Failed to cleanup expired data:", error)
    }
  }

  /**
   * Get database statistics
   */
  async getStatistics(): Promise<Record<string, any>> {
    try {
      const stats: Record<string, any> = {}

      // Get table row counts
      const tables = ["users", "transactions", "command_stats", "error_logs", "reputation", "inventory"]

      for (const table of tables) {
        const result = await this.get(`SELECT COUNT(*) as count FROM ${table}`)
        stats[`${table}_count`] = result.count
      }

      // Get database file size
      try {
        const dbStats = await fs.stat(this.dbPath)
        stats.database_size_mb = (dbStats.size / (1024 * 1024)).toFixed(2)
      } catch {
        stats.database_size_mb = "Unknown"
      }

      return stats
    } catch (error) {
      throw new Error(`Failed to get database statistics: ${error}`)
    }
  }
}
