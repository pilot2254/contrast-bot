import { REST, Routes } from "discord.js"
import { config } from "./config"
import { logger } from "./logger"
import fs from "fs"
import path from "path"

const commands: any[] = []
const commandsPath = path.join(__dirname, "..", "commands")

// Function to recursively load commands from directories
async function loadCommands(dir: string) {
  // Check if directory exists
  if (!fs.existsSync(dir)) {
    logger.error(`Directory not found: ${dir}`)
    return
  }

  const items = fs.readdirSync(dir, { withFileTypes: true })

  for (const item of items) {
    const itemPath = path.join(dir, item.name)

    if (item.isDirectory()) {
      // Skip Developer directory since those are prefix-only commands
      if (item.name === "Developer") {
        logger.info(`Skipping Developer directory (prefix commands only)`)
        continue
      }

      // Recursively load commands from subdirectories
      await loadCommands(itemPath)
    } else if (item.isFile() && (item.name.endsWith(".js") || item.name.endsWith(".ts"))) {
      try {
        const command = await import(itemPath)

        // Only push slash command data to array (skip developer commands)
        if (command.data) {
          commands.push(command.data.toJSON())
          logger.info(`Added slash command: ${command.data.name} from ${itemPath}`)
        } else {
          logger.info(`Skipped ${itemPath} (no slash command data - likely a developer command)`)
        }
      } catch (error) {
        logger.error(`Error loading command from ${itemPath}:`, error)
      }
    }
  }
}
// Dynamically import commands
;(async () => {
  // Load commands from all directories
  await loadCommands(commandsPath)

  // Construct and prepare an instance of the REST module
  const rest = new REST().setToken(config.token)

  try {
    logger.info(`Started refreshing ${commands.length} application (/) commands.`)

    let data

    if (config.guildId && process.env.DEPLOY_GUILD_COMMANDS === "true") {
      // The put method is used to fully refresh all commands in the guild with the current set
      logger.info(`Deploying commands to development guild: ${config.guildId}`)
      data = await rest.put(Routes.applicationGuildCommands(config.clientId, config.guildId), { body: commands })
      logger.info(`Successfully reloaded application commands for development guild.`)
    } else {
      // The put method is used to fully refresh all commands globally
      logger.info("Deploying commands globally")
      data = await rest.put(Routes.applicationCommands(config.clientId), { body: commands })
      logger.info(`Successfully reloaded application commands globally.`)
    }

    logger.info(`Registered ${(data as any[]).length} slash commands.`)
    logger.info(
      `Note: ${config.botName} developer commands use prefix (${config.prefix}) and are not deployed as slash commands.`,
    )
  } catch (error) {
    logger.error("Error refreshing commands:", error)
  }
})()
