import chalk from "chalk";
import fs from "fs/promises";
import path from "path";
import { config } from "../config/bot.config";

export class Logger {
  private logLevels = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };

  private currentLevel: number;

  constructor() {
    this.currentLevel =
      this.logLevels[config.logging.level as keyof typeof this.logLevels] || 1;
    this.initializeLogDirectory();
  }

  private async initializeLogDirectory(): Promise<void> {
    if (config.logging.enableFileLogging) {
      try {
        await fs.mkdir(config.logging.logDirectory, { recursive: true });
      } catch (error) {
        console.error("Failed to create log directory:", error);
      }
    }
  }

  private getTimestamp(): string {
    return new Date().toISOString().replace("T", " ").substring(0, 19);
  }

  private shouldLog(level: keyof typeof this.logLevels): boolean {
    return this.logLevels[level] >= this.currentLevel;
  }

  private async writeToFile(
    level: string,
    message: string,
    data?: any,
  ): Promise<void> {
    if (!config.logging.enableFileLogging) return;

    try {
      const timestamp = new Date().toISOString();
      const logEntry = {
        timestamp,
        level: level.toUpperCase(),
        message,
        data: data || null,
      };

      const logLine = JSON.stringify(logEntry) + "\n";
      const logFile = path.join(
        config.logging.logDirectory,
        `${new Date().toISOString().split("T")[0]}.log`,
      );

      await fs.appendFile(logFile, logLine);
    } catch (error) {
      console.error("Failed to write to log file:", error);
    }
  }

  private formatMessage(level: string, message: string, data?: any): string {
    let formatted = `[${this.getTimestamp()}] [${level.toUpperCase()}] ${message}`;

    if (data) {
      if (typeof data === "object") {
        formatted += `\n${JSON.stringify(data, null, 2)}`;
      } else {
        formatted += ` ${data}`;
      }
    }

    return formatted;
  }

  debug(message: string, data?: any): void {
    if (!this.shouldLog("debug")) return;

    const formatted = this.formatMessage("debug", message, data);
    console.log(chalk.gray(formatted));
    this.writeToFile("debug", message, data);
  }

  info(message: string, data?: any): void {
    if (!this.shouldLog("info")) return;

    const formatted = this.formatMessage("info", message, data);
    console.log(chalk.blue(formatted));
    this.writeToFile("info", message, data);
  }

  success(message: string, data?: any): void {
    if (!this.shouldLog("info")) return;

    const formatted = this.formatMessage("success", message, data);
    console.log(chalk.green(formatted));
    this.writeToFile("success", message, data);
  }

  warn(message: string, data?: any): void {
    if (!this.shouldLog("warn")) return;

    const formatted = this.formatMessage("warn", message, data);
    console.log(chalk.yellow(formatted));
    this.writeToFile("warn", message, data);
  }

  error(message: string, data?: any): void {
    if (!this.shouldLog("error")) return;

    const formatted = this.formatMessage("error", message, data);
    console.error(chalk.red(formatted));
    this.writeToFile("error", message, data);
  }

  command(userId: string, commandName: string, guildId?: string): void {
    if (!config.logging.logCommands) return;

    const message = `User: ${userId} | Command: ${commandName}${guildId ? ` | Guild: ${guildId}` : ""}`;
    const formatted = this.formatMessage("cmd", message);
    console.log(chalk.magenta(formatted));
    this.writeToFile("command", message, { userId, commandName, guildId });
  }

  transaction(
    userId: string,
    type: string,
    amount: number,
    description: string,
  ): void {
    if (!config.logging.logTransactions) return;

    const message = `User: ${userId} | Type: ${type} | Amount: ${amount} | Description: ${description}`;
    const formatted = this.formatMessage("txn", message);
    console.log(chalk.cyan(formatted));
    this.writeToFile("transaction", message, {
      userId,
      type,
      amount,
      description,
    });
  }

  /**
   * Clean up old log files
   */
  async cleanupOldLogs(): Promise<void> {
    if (!config.logging.enableFileLogging) return;

    try {
      const files = await fs.readdir(config.logging.logDirectory);
      const logFiles = files.filter((file) => file.endsWith(".log"));

      if (logFiles.length <= config.logging.maxLogFiles) return;

      // Sort files by date (oldest first)
      logFiles.sort();

      // Remove oldest files
      const filesToRemove = logFiles.slice(
        0,
        logFiles.length - config.logging.maxLogFiles,
      );

      for (const file of filesToRemove) {
        await fs.unlink(path.join(config.logging.logDirectory, file));
        this.debug(`Removed old log file: ${file}`);
      }
    } catch (error) {
      this.error("Failed to cleanup old logs:", error);
    }
  }
}
