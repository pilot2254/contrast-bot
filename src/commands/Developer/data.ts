import { type Message, EmbedBuilder } from "discord.js"
import { botInfo } from "../../utils/bot-info"
import { isDeveloper, logUnauthorizedAttempt } from "../../utils/permissions"
import { logger } from "../../utils/logger"
import { getDb } from "../../utils/database"
import fs from "fs"
import path from "path"

// Prefix command definition
export const name = "data"
export const aliases = ["datafiles", "files", "db", "database"]
export const description = "Shows database information"
export const usage = ""

// Prefix command execution
export async function run(message: Message, _args: string[]) {
  // Direct ID check as a fallback
  const userId = String(message.author.id).trim()
  logger.info(`Data command attempted by user ID: "${userId}"`)

  // Check if user is a developer using both methods
  const isDev = isDeveloper(message.author) || userId === "171395713064894465"

  if (!isDev) {
    logUnauthorizedAttempt(userId, "data")
    logger.warn(`Permission denied for data command. User ID: ${userId}`)
    return message.reply("You don't have permission to use this command.")
  }

  logger.info(`Data command authorized for user ${userId}`)

  try {
    const db = getDb()

    // Get database file size
    const dbPath = path.join(process.cwd(), "data", "bot.db")
    const dbSize = fs.existsSync(dbPath) ? fs.statSync(dbPath).size : 0

    // Get table information
    const tables = await db.all("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")

    // Get row counts for each table
    const tableInfo = await Promise.all(
      tables.map(async (table) => {
        const count = await db.get(`SELECT COUNT(*) as count FROM ${table.name}`)
        return {
          name: table.name,
          count: count.count,
        }
      }),
    )

    const embed = new EmbedBuilder()
      .setTitle("Database Information")
      .setColor(botInfo.colors.primary)
      .setDescription("Information about the SQLite database")
      .addFields(
        { name: "Database Size", value: formatBytes(dbSize), inline: true },
        { name: "Tables", value: tables.length.toString(), inline: true },
      )
      .setFooter({ text: `Requested by ${message.author.tag}` })
      .setTimestamp()

    // Add fields for each table
    tableInfo.forEach((table) => {
      embed.addFields({
        name: table.name,
        value: `${table.count} rows`,
        inline: true,
      })
    })

    await message.reply({ embeds: [embed] })
  } catch (error) {
    logger.error("Error getting database info:", error)
    await message.reply("An error occurred while getting database information.")
  }
}

// Helper function to format bytes
function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return "0 Bytes"

  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"]

  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i]
}
