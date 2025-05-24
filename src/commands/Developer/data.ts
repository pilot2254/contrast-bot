import type { Message } from "discord.js"
import { getDatabase } from "../../utils/database"

// Prefix command definition
export const name = "data"
export const aliases = ["db", "database"]
export const description = "Show database information"
export const usage = ""
export const category = "Developer"

// Prefix command execution
export async function run(message: Message, args: string[]) {
  try {
    const db = getDatabase()

    // Get table information
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as { name: string }[]

    let info = "📊 **Database Information**\n\n"
    info += `**Tables:** ${tables.length}\n`

    for (const table of tables) {
      const count = db.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get() as { count: number }
      info += `• ${table.name}: ${count.count} records\n`
    }

    // Get database file size
    const fs = require("fs")
    const path = require("path")
    const dbPath = path.join(process.cwd(), "data", "database.db")

    if (fs.existsSync(dbPath)) {
      const stats = fs.statSync(dbPath)
      const fileSizeInBytes = stats.size
      const fileSizeInMB = (fileSizeInBytes / (1024 * 1024)).toFixed(2)
      info += `\n**File Size:** ${fileSizeInMB} MB`
    }

    await message.reply(info)
  } catch (error) {
    await message.reply("❌ An error occurred while fetching database information.")
  }
}
