import chalk from "chalk"

export class Logger {
  private getTimestamp(): string {
    return new Date().toISOString().replace("T", " ").substring(0, 19)
  }

  info(message: string, ...args: any[]): void {
    console.log(chalk.blue(`[${this.getTimestamp()}] [INFO]`), message, ...args)
  }

  success(message: string, ...args: any[]): void {
    console.log(chalk.green(`[${this.getTimestamp()}] [SUCCESS]`), message, ...args)
  }

  warn(message: string, ...args: any[]): void {
    console.log(chalk.yellow(`[${this.getTimestamp()}] [WARN]`), message, ...args)
  }

  error(message: string, ...args: any[]): void {
    console.error(chalk.red(`[${this.getTimestamp()}] [ERROR]`), message, ...args)
  }

  debug(message: string, ...args: any[]): void {
    if (process.env.NODE_ENV === "development") {
      console.log(chalk.gray(`[${this.getTimestamp()}] [DEBUG]`), message, ...args)
    }
  }

  command(userId: string, commandName: string, guildId?: string): void {
    console.log(
      chalk.magenta(`[${this.getTimestamp()}] [CMD]`),
      `User: ${userId} | Command: ${commandName}${guildId ? ` | Guild: ${guildId}` : ""}`,
    )
  }
}
