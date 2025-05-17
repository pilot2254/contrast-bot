import { Events, type Interaction } from "discord.js"
import { logger } from "../utils/logger"
import { trackCommand } from "../utils/stats-manager"

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

    try {
      // Track command usage
      trackCommand(interaction.commandName)

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