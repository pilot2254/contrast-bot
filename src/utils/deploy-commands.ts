import { REST, Routes } from "discord.js"
import { config } from "./config"
import { logger } from "./logger"
import fs from "fs"
import path from "path"

const commands: any[] = []

async function loadCommands() {
  const commandsPath = path.join(__dirname, "..", "commands")

  if (!fs.existsSync(commandsPath)) {
    logger.error(`Commands directory not found at ${commandsPath}`)
    return
  }

  const commandFolders = fs.readdirSync(commandsPath)

  for (const folder of commandFolders) {
    const folderPath = path.join(commandsPath, folder)

    if (!fs.statSync(folderPath).isDirectory()) continue

    // Skip Developer folder as it contains prefix commands only
    if (folder === "Developer") {
      logger.info("Skipping Developer directory (prefix commands only)")
      continue
    }

    const commandFiles = fs.readdirSync(folderPath).filter((file) => file.endsWith(".ts") || file.endsWith(".js"))

    for (const file of commandFiles) {
      const filePath = path.join(folderPath, file)

      try {
        // Clear require cache to ensure fresh imports
        delete require.cache[require.resolve(filePath)]

        const command = await import(filePath)

        if (command.data && command.execute) {
          commands.push(command.data.toJSON())
          logger.info(`Added slash command: ${command.data.name} from ${filePath}`)
        } else {
          logger.warn(`Command at ${filePath} is missing required "data" or "execute" property`)
        }
      } catch (error) {
        logger.error(`Error loading command from ${filePath}:`, error)
      }
    }
  }
}

async function deployCommands() {
  try {
    await loadCommands()

    if (commands.length === 0) {
      logger.error("No commands found to deploy!")
      return
    }

    logger.info(`Started refreshing ${commands.length} application (/) commands.`)

    const rest = new REST().setToken(config.token)

    if (config.deployGuildCommands && config.guildId) {
      logger.info("Deploying commands to guild")
      await rest.put(Routes.applicationGuildCommands(config.clientId, config.guildId), {
        body: commands,
      })
      logger.info(`Successfully reloaded application commands for guild ${config.guildId}.`)
    } else {
      logger.info("Deploying commands globally")
      await rest.put(Routes.applicationCommands(config.clientId), {
        body: commands,
      })
      logger.info("Successfully reloaded application commands globally.")
    }

    logger.info(`Registered ${commands.length} slash commands.`)
    logger.info("Note: Contrast developer commands use prefix (?) and are not deployed as slash commands.")
  } catch (error) {
    logger.error("Failed to deploy commands:", error)
    process.exit(1)
  }
}

deployCommands()
