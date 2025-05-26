import type { Message } from "discord.js"
import { getDb } from "../../utils/database"
import fs from "fs"
import path from "path"
import { config } from "../../utils/config"

// Prefix command definition
export const name = "data"
export const aliases = ["db", "database"]
export const description = "Show database information"
export const usage = ""
export const category = "Developer"

// Prefix command execution
export async function run(message: Message, _args: string[]) {
  try {
    const db = getDb()

    // Get table information
    const tables = await db.all("SELECT name FROM sqlite_master WHERE type='table'")

    let info = `📊 **${config.botName} Database Information**\n\n`
    info += `**Tables:** ${tables.length}\n`

    for (const table of tables) {
      const count = await db.get(`SELECT COUNT(*) as count FROM ${table.name}`)
      info += `• ${table.name}: ${count.count} records\n`
    }

    // Get database file size
    const dbPath = path.join(process.cwd(), "data", "bot.db")

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
