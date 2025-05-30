import chalk from "chalk"
import { config } from "../config/bot.config"
import fs from "fs/promises"
import path from "path"

type LogLevel = "debug" | "info" | "warn" | "error" | "success"

export class Logger {
  private context?: string

  constructor(context?: string) {
    this.context = context
  }

  debug(message: string, data?: unknown): void {
    if (config.logging.level === "debug") {
      this.log("debug", message, data)
    }
  }

  info(message: string, data?: unknown): void {
    this.log("info", message, data)
  }

  warn(message: string, data?: unknown): void {
    this.log("warn", message, data)
  }

  error(message: string, data?: unknown): void {
    this.log("error", message, data)
  }

  success(message: string, data?: unknown): void {
    this.log("success", message, data)
  }

  command(userId: string, commandName: string, guildId?: string): void {
    if (config.logging.logCommands) {
      this.info(
        `Command executed: /${commandName} by ${userId}${guildId ? ` in ${guildId}` : ""}`
      )
    }
  }

  transaction(
    userId: string,
    type: string,
    amount: number,
    reason: string
  ): void {
    if (config.logging.logTransactions) {
      this.info(`Transaction: ${type} ${amount} for ${userId} - ${reason}`)
    }
  }

  private log(level: LogLevel, message: string, data?: unknown): void {
    const timestamp = new Date().toISOString()
    const contextStr = this.context ? `[${this.context}] ` : ""

    // Format message with colors
    let coloredMessage: string
    switch (level) {
      case "debug":
        coloredMessage = chalk.gray(
          `[${timestamp}] ${contextStr}DEBUG: ${message}`
        )
        break
      case "info":
        coloredMessage = chalk.blue(
          `[${timestamp}] ${contextStr}INFO: ${message}`
        )
        break
      case "warn":
        coloredMessage = chalk.yellow(
          `[${timestamp}] ${contextStr}WARN: ${message}`
        )
        break
      case "error":
        coloredMessage = chalk.red(
          `[${timestamp}] ${contextStr}ERROR: ${message}`
        )
        break
      case "success":
        coloredMessage = chalk.green(
          `[${timestamp}] ${contextStr}SUCCESS: ${message}`
        )
        break
    }

    console.log(coloredMessage)

    if (data) {
      console.log(chalk.gray("Data:"), data)
    }

    // Write to file if enabled
    if (config.logging.enableFileLogging) {
      this.writeToFile(level, timestamp, contextStr, message, data).catch(
        console.error
      )
    }
  }

  private async writeToFile(
    level: LogLevel,
    timestamp: string,
    context: string,
    message: string,
    data?: unknown
  ): Promise<void> {
    try {
      const logDir = config.logging.logDirectory
      await fs.mkdir(logDir, { recursive: true })

      const date = new Date().toISOString().split("T")[0]
      const logFile = path.join(logDir, `${date}.log`)

      let logEntry = `[${timestamp}] ${context}${level.toUpperCase()}: ${message}\n`
      if (data) {
        logEntry += `Data: ${JSON.stringify(data, null, 2)}\n`
      }

      await fs.appendFile(logFile, logEntry)

      // Cleanup old log files
      await this.cleanupOldLogs()
    } catch (error) {
      console.error("Failed to write to log file:", error)
    }
  }

  private async cleanupOldLogs(): Promise<void> {
    try {
      const logDir = config.logging.logDirectory
      const files = await fs.readdir(logDir)
      const logFiles = files.filter((file) => file.endsWith(".log"))

      if (logFiles.length > config.logging.maxLogFiles) {
        // Sort by date and remove oldest files
        logFiles.sort()
        const filesToDelete = logFiles.slice(
          0,
          logFiles.length - config.logging.maxLogFiles
        )

        for (const file of filesToDelete) {
          await fs.unlink(path.join(logDir, file))
        }
      }
    } catch (error) {
      console.error("Failed to cleanup old logs:", error)
    }
  }
}
