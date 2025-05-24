import { Events, type Interaction } from "discord.js"
import { logger } from "../utils/logger"
import { trackCommand } from "../utils/stats-manager"
import { isBlacklisted, isMaintenanceMode } from "../utils/blacklist-manager"
import { isDeveloper } from "../utils/permissions"

export const name = Events.InteractionCreate
export const once = false

export async function execute(interaction: Interaction): Promise<void> {
  // Handle slash commands
  if (interaction.isChatInputCommand()) {
    const command = interaction.client.commands.get(interaction.commandName)

    if (!command) {
      logger.warn(`No command matching ${interaction.commandName} was found.`)
      return
    }

    // Check if user is blacklisted
    const blacklisted = await isBlacklisted(interaction.user.id)
    if (blacklisted) {
      await interaction.reply({
        content: "You have been blacklisted from using this bot.",
        ephemeral: true,
      })
      return
    }

    // Check if maintenance mode is enabled (allow developers to bypass)
    const maintenanceMode = await isMaintenanceMode()
    if (maintenanceMode && !isDeveloper(interaction.user)) {
      await interaction.reply({
        content: "The bot is currently in maintenance mode. Please try again later.",
        ephemeral: true,
      })
      return
    }

    try {
      // Track command usage
      await trackCommand(interaction.commandName)

      // Execute the command
      if (command.execute) {
        await command.execute(interaction)
      } else {
        logger.warn(`Command ${interaction.commandName} has no execute method.`)
        await interaction.reply({
          content: "This command is not properly implemented.",
          ephemeral: true,
        })
      }
    } catch (error) {
      logger.error(`Error executing command ${interaction.commandName}:`, error)

      const replyOptions = {
        content: "There was an error while executing this command!",
        ephemeral: true,
      }

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(replyOptions).catch((e) => {
          logger.error("Failed to send error followUp:", e)
        })
      } else {
        await interaction.reply(replyOptions).catch((e) => {
          logger.error("Failed to send error reply:", e)
        })
      }
    }
  }

  // Handle autocomplete interactions
  else if (interaction.isAutocomplete()) {
    const command = interaction.client.commands.get(interaction.commandName)

    if (!command || !command.autocomplete) {
      return
    }

    try {
      await command.autocomplete(interaction)
    } catch (error) {
      logger.error(`Error handling autocomplete for ${interaction.commandName}:`, error)
    }
  }
}
