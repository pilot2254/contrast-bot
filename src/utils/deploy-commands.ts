import { REST, Routes } from "discord.js"
import { config } from "./config"
import { logger } from "./logger"
import fs from "fs"
import path from "path"

const commands = []
const commandsPath = path.join(__dirname, "..", "commands")
const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith(".js") || file.endsWith(".ts"))

// Dynamically import commands
;(async () => {
  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file)
    try {
      const command = await import(filePath)

      // Push slash command data to array
      if (command.data) {
        commands.push(command.data.toJSON())
        logger.info(`Added command: ${command.data.name}`)
      }
    } catch (error) {
      logger.error(`Error loading command from ${filePath}:`, error)
    }
  }

  // Construct and prepare an instance of the REST module
  const rest = new REST().setToken(config.token)

  try {
    logger.info(`Started refreshing ${commands.length} application (/) commands.`)

    let data

    if (config.guildId) {
      // The put method is used to fully refresh all commands in the guild with the current set
      data = await rest.put(Routes.applicationGuildCommands(config.clientId, config.guildId), { body: commands })
      logger.info(`Successfully reloaded application commands for development guild.`)
    } else {
      // The put method is used to fully refresh all commands globally
      data = await rest.put(Routes.applicationCommands(config.clientId), { body: commands })
      logger.info(`Successfully reloaded application commands globally.`)
    }

    logger.info(`Registered ${(data as any[]).length} commands.`)
  } catch (error) {
    logger.error("Error refreshing commands:", error)
  }
})()