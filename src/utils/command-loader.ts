import { Collection } from "discord.js"
import fs from "fs"
import path from "path"
import { logger } from "./logger"
import type { Command } from "./types"

/**
 * Loads all commands from the commands directory and its subdirectories
 * @param commandsDir The directory containing command files and category folders
 * @returns Object containing slash commands and prefix commands collections
 */
export async function loadCommands(commandsDir: string): Promise<{
  commands: Collection<string, Command>
  prefixCommands: Collection<string, Command>
}> {
  const commands = new Collection<string, Command>()
  const prefixCommands = new Collection<string, Command>()

  // Check if commands directory exists
  if (!fs.existsSync(commandsDir)) {
    logger.error(`Commands directory not found: ${commandsDir}`)
    return { commands, prefixCommands }
  }

  // Get all items in the commands directory
  const items = fs.readdirSync(commandsDir, { withFileTypes: true })

  // Process each item (file or directory)
  for (const item of items) {
    const itemPath = path.join(commandsDir, item.name)

    if (item.isDirectory()) {
      // This is a category folder
      const category = item.name

      // Get all command files in this category
      const categoryFiles = fs.readdirSync(itemPath).filter((file) => file.endsWith(".js") || file.endsWith(".ts"))

      // Load each command in this category
      for (const file of categoryFiles) {
        const filePath = path.join(itemPath, file)
        await loadCommandFile(filePath, category, commands, prefixCommands)
      }
    } else if (item.isFile() && (item.name.endsWith(".js") || item.name.endsWith(".ts"))) {
      // This is a command file in the root directory
      await loadCommandFile(itemPath, "Miscellaneous", commands, prefixCommands)
    }
  }

  return { commands, prefixCommands }
}

/**
 * Loads a single command file
 * @param filePath Path to the command file
 * @param category Category of the command
 * @param commands Collection to store slash commands
 * @param prefixCommands Collection to store prefix commands
 */
async function loadCommandFile(
  filePath: string,
  category: string,
  commands: Collection<string, Command>,
  prefixCommands: Collection<string, Command>,
): Promise<void> {
  try {
    // Import the command module
    const commandModule = await import(filePath)

    // Set the category based on the folder structure
    // This will override any category defined in the file
    commandModule.category = category

    // Register slash command
    if (commandModule.data) {
      commands.set(commandModule.data.name, commandModule)
      logger.info(`Loaded slash command: ${commandModule.data.name} (Category: ${category})`)
    }

    // Register prefix command
    if (commandModule.name) {
      prefixCommands.set(commandModule.name, commandModule)
      logger.info(`Loaded prefix command: ${commandModule.name} (Category: ${category})`)
    }
  } catch (error) {
    logger.error(`Error loading command from ${filePath}:`, error)
  }
}
