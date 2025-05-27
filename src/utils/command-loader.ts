import { Collection } from "discord.js"
import fs from "fs"
import path from "path"
import { logger } from "./logger"
import type { Command } from "./types"

export async function loadCommands(commandsPath: string): Promise<{
  commands: Collection<string, Command>
  prefixCommands: Collection<string, Command>
}> {
  const commands = new Collection<string, Command>()
  const prefixCommands = new Collection<string, Command>()

  if (!fs.existsSync(commandsPath)) {
    logger.error(`Commands directory not found at ${commandsPath}`)
    return { commands, prefixCommands }
  }

  const commandFolders = fs.readdirSync(commandsPath)

  for (const folder of commandFolders) {
    const folderPath = path.join(commandsPath, folder)

    if (!fs.statSync(folderPath).isDirectory()) continue

    const commandFiles = fs.readdirSync(folderPath).filter((file) => file.endsWith(".ts") || file.endsWith(".js"))

    for (const file of commandFiles) {
      const filePath = path.join(folderPath, file)

      try {
        // Clear require cache for hot reloading
        delete require.cache[require.resolve(filePath)]

        const command = await import(filePath)

        if (!command.data || !command.execute) {
          logger.warn(`Command at ${filePath} is missing required "data" or "execute" property`)
          continue
        }

        // Developer commands are prefix commands
        if (folder === "Developer") {
          if (command.data.name) {
            prefixCommands.set(command.data.name, command)
            logger.info(`Loaded prefix command: ${command.data.name}`)
          }
        } else {
          // All other commands are slash commands
          if (command.data.name) {
            commands.set(command.data.name, command)
            logger.info(`Loaded slash command: ${command.data.name}`)
          }
        }
      } catch (error) {
        logger.error(`Error loading command from ${filePath}:`, error)
      }
    }
  }

  return { commands, prefixCommands }
}
