import { initDatabase, closeDatabase } from "./database"
import { logger } from "./logger"

async function initialize() {
  try {
    logger.info("Initializing database...")
    await initDatabase()
    logger.info("Database initialized successfully!")
  } catch (error) {
    logger.error("Failed to initialize database:", error)
  } finally {
    await closeDatabase()
  }
}

// Run the initialization
initialize()
  .then(() => {
    logger.info("Database initialization script completed")
    process.exit(0)
  })
  .catch((error) => {
    logger.error("Database initialization script failed:", error)
    process.exit(1)
  })
