import dotenv from "dotenv"
import { logger } from "./logger"

// Load environment variables
dotenv.config()

// Define configuration interface
interface Config {
  token: string
  clientId: string
  guildId: string
  prefix: string
  botName: string
}

// Validate required environment variables
const requiredEnvVars = ["TOKEN", "CLIENT_ID"]
const missingEnvVars = requiredEnvVars.filter((envVar) => !process.env[envVar])

if (missingEnvVars.length > 0) {
  logger.error(`Missing required environment variables: ${missingEnvVars.join(", ")}`)
  logger.info("Please check your .env file and ensure all required variables are set.")
  process.exit(1)
}

// Export configuration
export const config: Config = {
  token: process.env.TOKEN!,
  clientId: process.env.CLIENT_ID!,
  guildId: process.env.GUILD_ID || "",
  prefix: process.env.PREFIX || "?",
  botName: process.env.BOT_NAME || "Contrast",
}