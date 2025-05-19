import { logger } from "./logger"
import { getDb } from "./database"

/**
 * Initializes the stats manager
 */
export async function initStats(): Promise<void> {
  try {
    logger.info("Stats manager initialized")
  } catch (error) {
    logger.error("Failed to initialize stats:", error)
  }
}

/**
 * Updates the guild count
 * @param count The new guild count
 */
export async function updateGuildCount(count: number): Promise<void> {
  try {
    const db = getDb()
    await db.run("UPDATE stats SET value = ? WHERE key = 'guild_count'", count.toString())
    logger.info(`Updated guild count to ${count}`)
  } catch (error) {
    logger.error("Failed to update guild count:", error)
  }
}

/**
 * Tracks a command usage
 * @param commandName The name of the command that was used
 */
export async function trackCommand(commandName: string): Promise<void> {
  try {
    const db = getDb()

    // Update command-specific count
    await db.run(
      "INSERT INTO command_usage (command_name, count) VALUES (?, 1) " +
        "ON CONFLICT(command_name) DO UPDATE SET count = count + 1",
      commandName,
    )

    // Update total commands count
    await db.run("UPDATE stats SET value = CAST(CAST(value AS INTEGER) + 1 AS TEXT) WHERE key = 'total_commands'")

    logger.debug(`Tracked command usage: ${commandName}`)
  } catch (error) {
    logger.error(`Failed to track command usage for ${commandName}:`, error)
  }
}

/**
 * Gets the current stats
 * @returns The current stats
 */
export async function getStats(): Promise<{
  commandsUsed: Record<string, number>
  totalCommands: number
  guildCount: number
  startTime: number
}> {
  try {
    const db = getDb()

    // Get all command usage
    const commandRows = await db.all("SELECT command_name, count FROM command_usage")
    const commandsUsed: Record<string, number> = {}
    commandRows.forEach((row: any) => {
      commandsUsed[row.command_name] = row.count
    })

    // Get total commands
    const totalCommandsRow = await db.get("SELECT value FROM stats WHERE key = 'total_commands'")
    const totalCommands = Number.parseInt(totalCommandsRow?.value || "0", 10)

    // Get guild count
    const guildCountRow = await db.get("SELECT value FROM stats WHERE key = 'guild_count'")
    const guildCount = Number.parseInt(guildCountRow?.value || "0", 10)

    // Get start time
    const startTimeRow = await db.get("SELECT value FROM stats WHERE key = 'start_time'")
    const startTime = Number.parseInt(startTimeRow?.value || Date.now().toString(), 10)

    return {
      commandsUsed,
      totalCommands,
      guildCount,
      startTime,
    }
  } catch (error) {
    logger.error("Failed to get stats:", error)
    // Return default values in case of error
    return {
      commandsUsed: {},
      totalCommands: 0,
      guildCount: 0,
      startTime: Date.now(),
    }
  }
}
