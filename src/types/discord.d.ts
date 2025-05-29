import type { Collection } from "discord.js";
import type { Database } from "../database/Database";
import type { Logger } from "../utils/Logger";
import type { ErrorHandler } from "../utils/ErrorHandler";

declare module "discord.js" {
  export interface Client {
    commands: Collection<string, any>;
    cooldowns: Collection<string, Collection<string, number>>;
    database: Database;
    logger: Logger;
    errorHandler: ErrorHandler;
  }
}
