import { REST, Routes } from "discord.js"
import dotenv from "dotenv"
import { logger } from "./logger"
import path from "path"
import fs from "fs"

// Explicitly load environment variables from .env file
const envPath = path.resolve(process.cwd(), ".env")
if (fs.existsSync(envPath)) {
  logger.info(`Loading environment variables from ${envPath}`)
  dotenv.config({ path: envPath })
} else {
  logger.warn(`.env file not found at ${envPath}`)
  dotenv.config() // Try default loading
}

// Log the environment variables (without showing sensitive values)
logger.info("Environment variables loaded:")
logger.info(`- TOKEN: ${process.env.TOKEN ? "✓ Set" : "✗ Not set"}`)
logger.info(`- CLIENT_ID: ${process.env.CLIENT_ID ? "✓ Set" : "✗ Not set"}`)
logger.info(`- GUILD_ID: ${process.env.GUILD_ID ? "✓ Set" : "✗ Not set"}`)

// Check if required environment variables are set
if (!process.env.TOKEN || !process.env.CLIENT_ID || !process.env.GUILD_ID) {
  logger.error("Missing required environment variables: TOKEN, CLIENT_ID, or GUILD_ID")
  process.exit(1)
}

// Get values from environment variables
const token = process.env.TOKEN
const clientId = process.env.CLIENT_ID
const guildId = process.env.GUILD_ID

// Construct and prepare an instance of the REST module
const rest = new REST().setToken(token)

// Function to clear guild commands
async function clearGuildCommands() {
  try {
    logger.info(`Started clearing application commands for guild ${guildId}...`)

    // The put method with an empty array will clear all commands
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: [] })

    logger.info(`Successfully cleared all guild commands from ${guildId}!`)
  } catch (error) {
    logger.error("Error clearing guild commands:", error)
  }
}

// Execute the function
clearGuildCommands()