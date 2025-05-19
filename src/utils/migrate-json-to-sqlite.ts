import fs from "fs"
import path from "path"
import { logger } from "./logger"
import { initDatabase, getDb } from "./database"

// Path to the data directory
const DATA_DIR = path.join(process.cwd(), "data")

/**
 * Migrates data from JSON files to SQLite database
 */
async function migrateData(): Promise<void> {
  try {
    // Initialize database
    await initDatabase()
    logger.info("Database initialized")

    const db = getDb()

    // Migrate bot stats
    await migrateBotStats()

    // Migrate blacklist
    await migrateBlacklist()

    // Migrate quotes
    await migrateQuotes()

    // Migrate reputation
    await migrateReputation()

    // Migrate feedback
    await migrateFeedback()

    // Migrate RPS stats
    await migrateRPSStats()

    logger.info("Migration completed successfully")
  } catch (error) {
    logger.error("Migration failed:", error)
  }
}

/**
 * Migrates bot stats from JSON to SQLite
 */
async function migrateBotStats(): Promise<void> {
  try {
    const statsFile = path.join(DATA_DIR, "bot-stats.json")
    if (!fs.existsSync(statsFile)) {
      logger.info("No bot stats file found, skipping migration")
      return
    }

    const statsData = JSON.parse(fs.readFileSync(statsFile, "utf8"))
    const db = getDb()

    // Start a transaction
    await db.exec("BEGIN TRANSACTION")

    try {
      // Update start time
      await db.run("UPDATE stats SET value = ? WHERE key = 'start_time'", statsData.startTime.toString())

      // Update guild count
      await db.run("UPDATE stats SET value = ? WHERE key = 'guild_count'", statsData.guildCount.toString())

      // Update total commands
      await db.run("UPDATE stats SET value = ? WHERE key = 'total_commands'", statsData.totalCommands.toString())

      // Add command usage
      for (const [command, count] of Object.entries(statsData.commandsUsed)) {
        await db.run("INSERT INTO command_usage (command_name, count) VALUES (?, ?)", command, count)
      }

      // Commit the transaction
      await db.exec("COMMIT")

      logger.info("Bot stats migrated successfully")
    } catch (error) {
      // Rollback on error
      await db.exec("ROLLBACK")
      throw error
    }
  } catch (error) {
    logger.error("Failed to migrate bot stats:", error)
  }
}

/**
 * Migrates blacklist from JSON to SQLite
 */
async function migrateBlacklist(): Promise<void> {
  try {
    const blacklistFile = path.join(DATA_DIR, "blacklist.json")
    if (!fs.existsSync(blacklistFile)) {
      logger.info("No blacklist file found, skipping migration")
      return
    }

    const blacklistData = JSON.parse(fs.readFileSync(blacklistFile, "utf8"))
    const db = getDb()

    // Start a transaction
    await db.exec("BEGIN TRANSACTION")

    try {
      // Set maintenance mode
      await db.run(
        "UPDATE maintenance_mode SET enabled = ?, updated_at = ? WHERE id = 1",
        blacklistData.maintenanceMode ? 1 : 0,
        Date.now(),
      )

      // Add blacklisted users
      for (const userId of blacklistData.users) {
        await db.run(
          "INSERT INTO blacklist (user_id, reason, added_at, added_by) VALUES (?, ?, ?, ?)",
          userId,
          "Migrated from JSON",
          Date.now(),
          null,
        )
      }

      // Commit the transaction
      await db.exec("COMMIT")

      logger.info("Blacklist migrated successfully")
    } catch (error) {
      // Rollback on error
      await db.exec("ROLLBACK")
      throw error
    }
  } catch (error) {
    logger.error("Failed to migrate blacklist:", error)
  }
}

/**
 * Migrates quotes from JSON to SQLite
 */
async function migrateQuotes(): Promise<void> {
  try {
    const quotesFile = path.join(DATA_DIR, "quotes.json")
    if (!fs.existsSync(quotesFile)) {
      logger.info("No quotes file found, skipping migration")
      return
    }

    const quotesData = JSON.parse(fs.readFileSync(quotesFile, "utf8"))
    const db = getDb()

    // Start a transaction
    await db.exec("BEGIN TRANSACTION")

    try {
      // Add quotes
      for (const quote of quotesData) {
        await db.run(
          "INSERT INTO quotes (id, text, author, author_id, timestamp) VALUES (?, ?, ?, ?, ?)",
          quote.id,
          quote.text,
          quote.author,
          quote.authorId,
          quote.timestamp,
        )
      }

      // Update the auto-increment sequence
      if (quotesData.length > 0) {
        const maxId = Math.max(...quotesData.map((q: any) => q.id))
        await db.run(`UPDATE sqlite_sequence SET seq = ? WHERE name = 'quotes'`, maxId)
      }

      // Commit the transaction
      await db.exec("COMMIT")

      logger.info("Quotes migrated successfully")
    } catch (error) {
      // Rollback on error
      await db.exec("ROLLBACK")
      throw error
    }
  } catch (error) {
    logger.error("Failed to migrate quotes:", error)
  }
}

/**
 * Migrates reputation from JSON to SQLite
 */
async function migrateReputation(): Promise<void> {
  try {
    const reputationFile = path.join(DATA_DIR, "reputation.json")
    if (!fs.existsSync(reputationFile)) {
      logger.info("No reputation file found, skipping migration")
      return
    }

    const reputationData = JSON.parse(fs.readFileSync(reputationFile, "utf8"))
    const db = getDb()

    // Start a transaction
    await db.exec("BEGIN TRANSACTION")

    try {
      // Add reputation records
      for (const rep of reputationData) {
        await db.run(
          `INSERT INTO reputation (
            user_id, username, received_positive, received_negative, 
            given_positive, given_negative, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          rep.userId,
          rep.username,
          rep.receivedPositive,
          rep.receivedNegative,
          rep.givenPositive,
          rep.givenNegative,
          Date.now(),
        )

        // Add reputation given records
        for (const receiverId of Object.keys(rep.givenTo || {})) {
          // We don't know if it was positive or negative, so we'll assume positive
          await db.run(
            "INSERT OR IGNORE INTO reputation_given (giver_id, receiver_id, is_positive, timestamp) VALUES (?, ?, 1, ?)",
            rep.userId,
            receiverId,
            Date.now(),
          )
        }
      }

      // Commit the transaction
      await db.exec("COMMIT")

      logger.info("Reputation migrated successfully")
    } catch (error) {
      // Rollback on error
      await db.exec("ROLLBACK")
      throw error
    }
  } catch (error) {
    logger.error("Failed to migrate reputation:", error)
  }
}

/**
 * Migrates feedback from JSON to SQLite
 */
async function migrateFeedback(): Promise<void> {
  try {
    const feedbackFile = path.join(DATA_DIR, "feedback.json")
    if (!fs.existsSync(feedbackFile)) {
      logger.info("No feedback file found, skipping migration")
      return
    }

    const feedbackData = JSON.parse(fs.readFileSync(feedbackFile, "utf8"))
    const db = getDb()

    // Start a transaction
    await db.exec("BEGIN TRANSACTION")

    try {
      // Add feedback entries
      for (const feedback of feedbackData) {
        await db.run(
          "INSERT INTO feedback (id, user_id, username, content, timestamp) VALUES (?, ?, ?, ?, ?)",
          feedback.id,
          feedback.userId,
          feedback.username,
          feedback.content,
          feedback.timestamp,
        )
      }

      // Update the auto-increment sequence
      if (feedbackData.length > 0) {
        const maxId = Math.max(...feedbackData.map((f: any) => f.id))
        await db.run(`UPDATE sqlite_sequence SET seq = ? WHERE name = 'feedback'`, maxId)
      }

      // Commit the transaction
      await db.exec("COMMIT")

      logger.info("Feedback migrated successfully")
    } catch (error) {
      // Rollback on error
      await db.exec("ROLLBACK")
      throw error
    }
  } catch (error) {
    logger.error("Failed to migrate feedback:", error)
  }
}

/**
 * Migrates RPS stats from JSON to SQLite
 */
async function migrateRPSStats(): Promise<void> {
  try {
    const rpsFile = path.join(DATA_DIR, "rps-stats.json")
    if (!fs.existsSync(rpsFile)) {
      logger.info("No RPS stats file found, skipping migration")
      return
    }

    const rpsData = JSON.parse(fs.readFileSync(rpsFile, "utf8"))
    const db = getDb()

    // Start a transaction
    await db.exec("BEGIN TRANSACTION")

    try {
      // Add RPS stats
      for (const stats of rpsData) {
        await db.run(
          `INSERT INTO rps_stats (
            user_id, username, wins, losses, ties, total_games, last_updated
          ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          stats.userId,
          stats.username,
          stats.wins,
          stats.losses,
          stats.ties,
          stats.totalGames,
          stats.lastUpdated,
        )
      }

      // Commit the transaction
      await db.exec("COMMIT")

      logger.info("RPS stats migrated successfully")
    } catch (error) {
      // Rollback on error
      await db.exec("ROLLBACK")
      throw error
    }
  } catch (error) {
    logger.error("Failed to migrate RPS stats:", error)
  }
}

// Run the migration
migrateData()
  .then(() => {
    logger.info("Migration script completed")
    process.exit(0)
  })
  .catch((error) => {
    logger.error("Migration script failed:", error)
    process.exit(1)
  })
