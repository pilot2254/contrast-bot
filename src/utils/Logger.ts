import chalk from "chalk"
import fs from "fs/promises"
import path from "path"
import { config } from "../config/bot.config"

type LogLevel = "debug" | "info" | "warn" | "error" | "success" | "cmd" | "txn"

export class Logger {
  private logLevels = {
    debug: 0,
    info: 1,
    success: 1,
    cmd: 1,
    txn: 1,
    warn: 2,
    error: 3,
  }

  private currentLevel: number

  constructor() {
    this.currentLevel = this.logLevels[config.logging.level as keyof typeof this.logLevels] ?? this.logLevels.info
    this.initializeLogDirectory()
  }

  private async initializeLogDirectory(): Promise<void> {
    if (config.logging.enableFileLogging) {
      try {
        await fs.mkdir(config.logging.logDirectory, { recursive: true })
      } catch (error) {
        console.error("Failed to create log directory:", error)
      }
    }
  }

  private getTimestamp(): string {
    return new Date().toISOString().replace("T", " ").substring(0, 19)
  }

  private shouldLog(level: LogLevel): boolean {
    return this.logLevels[level] >= this.currentLevel
  }

  private async writeToFile(level: string, message: string, data?: any): Promise<void> {
    if (!config.logging.enableFileLogging) return

    try {
      const timestamp = new Date().toISOString()
      const logEntry = {
        timestamp,
        level: level.toUpperCase(),
        message,
        data: data || null,
      }

      const logLine = JSON.stringify(logEntry) + "\n"
      const logFile = path.join(config.logging.logDirectory, `${new Date().toISOString().split("T")[0]}.log`)

      await fs.appendFile(logFile, logLine)
    } catch (error) {
      console.error("Failed to write to log file:", error instanceof Error ? error.message : String(error))
    }
  }

  private formatMessage(level: string, message: string, data?: any): string {
    let formatted = `[${this.getTimestamp()}] [${level.toUpperCase()}] ${message}`

    if (data !== undefined) {
      try {
        const dataString = JSON.stringify(data, null, 2)
        formatted += `\n${dataString}`
      } catch (e) {
        formatted += ` [UnserializableData]`
      }
    }

    return formatted
  }

  debug(message: string, data?: any): void {
    if (!this.shouldLog("debug")) return

    const formatted = this.formatMessage("debug", message, data)
    console.log(chalk.gray(formatted))
    this.writeToFile("debug", message, data)
  }

  info(message: string, data?: any): void {
    if (!this.shouldLog("info")) return

    const formatted = this.formatMessage("info", message, data)
    console.log(chalk.blue(formatted))
    this.writeToFile("info", message, data)
  }

  success(message: string, data?: any): void {
    if (!this.shouldLog("success")) return

    const formatted = this.formatMessage("success", message, data)
    console.log(chalk.green(formatted))
    this.writeToFile("success", message, data)
  }

  warn(message: string, data?: any): void {
    if (!this.shouldLog("warn")) return

    const formatted = this.formatMessage("warn", message, data)
    console.log(chalk.yellow(formatted))
    this.writeToFile("warn", message, data)
  }

  error(message: string, data?: any): void {
    if (!this.shouldLog("error")) return

    const formatted = this.formatMessage("error", message, data)
    console.error(chalk.red(formatted))
    this.writeToFile("error", message, data)
  }

  command(userId: string, commandName: string, guildId?: string): void {
    if (!config.logging.logCommands || !this.shouldLog("cmd")) return

    const logData = { userId, commandName, guildId: guildId ?? "DM" }
    const message = `User: ${userId} | Command: ${commandName}${guildId ? ` | Guild: ${guildId}` : " (DM)"}`

    const formatted = this.formatMessage("cmd", message)
    console.log(chalk.magenta(formatted))
    this.writeToFile("command", message, logData)
  }

  transaction(userId: string, type: string, amount: number, description: string): void {
    if (!config.logging.logTransactions || !this.shouldLog("txn")) return

    const logData = { userId, type, amount, description }
    const message = `User: ${userId} | Type: ${type} | Amount: ${amount} | Desc: ${description}`

    const formatted = this.formatMessage("txn", message)
    console.log(chalk.cyan(formatted))
    this.writeToFile("transaction", message, logData)
  }

  /**
   * Clean up old log files
   */
  async cleanupOldLogs(): Promise<void> {
    if (!config.logging.enableFileLogging) return

    try {
      const files = await fs.readdir(config.logging.logDirectory)
      const logFiles = files.filter((file) => file.endsWith(".log"))

      if (logFiles.length <= config.logging.maxLogFiles) return

      // Sort files by date (oldest first)
      logFiles.sort()

      // Remove oldest files
      const filesToRemove = logFiles.slice(0, logFiles.length - config.logging.maxLogFiles)

      for (const file of filesToRemove) {
        await fs.unlink(path.join(config.logging.logDirectory, file))
        this.debug(`Removed old log file: ${file}`)
      }
    } catch (error) {
      this.error("Failed to cleanup old logs:", error)
    }
  }
}
