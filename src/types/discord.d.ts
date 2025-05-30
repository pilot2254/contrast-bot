import type { Collection } from "discord.js"
import type { Database } from "../database/Database"
import type { Logger } from "../utils/Logger"
import type { ErrorHandler } from "../utils/ErrorHandler"
import type { Command } from "./Command" // Import the Command type

declare module "discord.js" {
  export interface Client {
    commands: Collection<string, Command> // Use the specific Command type
    cooldowns: Collection<string, Collection<string, number>>
    database: Database
    logger: Logger
    errorHandler: ErrorHandler
  }
}
