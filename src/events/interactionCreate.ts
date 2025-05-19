import { Events, type Interaction } from "discord.js"
import { logger } from "../utils/logger"
import { trackCommand } from "../utils/stats-manager"
import { isBlacklisted, isMaintenanceMode } from "../utils/blacklist-manager"
import { isDeveloper } from "../utils/permissions"

export const name = Events.InteractionCreate
export const once = false

export async function execute(interaction: Interaction) {
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
      return interaction.reply({
        content: "You have been blacklisted from using this bot.",
        ephemeral: true,
      })
    }

    // Check if maintenance mode is enabled (allow developers to bypass)
    const maintenanceMode = await isMaintenanceMode()
    if (maintenanceMode && !isDeveloper(interaction.user)) {
      return interaction.reply({
        content: "The bot is currently in maintenance mode. Please try again later.",
        ephemeral: true,
      })
    }

    try {
      // Track command usage
      await trackCommand(interaction.commandName)

      await command.execute?.(interaction)
    } catch (error) {
      logger.error(`Error executing command ${interaction.commandName}:`, error)

      const replyOptions = {
        content: "There was an error while executing this command!",
        ephemeral: true,
      }

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(replyOptions)
      } else {
        await interaction.reply(replyOptions)
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
