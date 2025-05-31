import { Events, type Interaction, Collection } from "discord.js"
import { config } from "../config/bot.config"
import type { ExtendedClient } from "../structures/ExtendedClient"

export default {
  name: Events.InteractionCreate,
  async execute(interaction: Interaction) {
    // Skip if not a command interaction
    if (!interaction.isChatInputCommand()) return

    const client = interaction.client as ExtendedClient
    const command = client.commands.get(interaction.commandName)

    // Log command usage
    client.logger.command(interaction.user.id, interaction.commandName, interaction.guild?.id)

    // Check if command exists
    if (!command) {
      client.logger.warn(`Command ${interaction.commandName} not found`)
      return
    }

    // Check for developer-only commands
    if (command.developerOnly && !config.bot.developers.includes(interaction.user.id)) {
      const errorEmbed = client.errorHandler.createUserError("This command is only available to bot developers.")
      await interaction.reply({ embeds: [errorEmbed], flags: [64] }) // EPHEMERAL flag
      return
    }

    // Check if user is blacklisted
    try {
      const blacklisted = await client.database.get("SELECT * FROM blacklist WHERE user_id = ?", [interaction.user.id])

      if (blacklisted) {
        const errorEmbed = client.errorHandler.createUserError("You have been blacklisted from using this bot.")
        await interaction.reply({ embeds: [errorEmbed], flags: [64] }) // EPHEMERAL flag
        return
      }
    } catch (error) {
      client.errorHandler.handle(error as Error, { interaction, command: interaction.commandName })
      return
    }

    // Handle command cooldowns
    if (command.cooldown) {
      const cooldowns = client.cooldowns

      if (!cooldowns.has(interaction.commandName)) {
        cooldowns.set(interaction.commandName, new Collection())
      }

      const now = Date.now()
      const timestamps = cooldowns.get(interaction.commandName)
      const cooldownAmount = command.cooldown * 1000

      if (timestamps?.has(interaction.user.id)) {
        const expirationTime = timestamps.get(interaction.user.id)! + cooldownAmount

        if (now < expirationTime) {
          const timeLeft = (expirationTime - now) / 1000
          const warningEmbed = client.errorHandler.createWarning(
            `Please wait ${timeLeft.toFixed(1)} more second(s) before using the \`${interaction.commandName}\` command again.`,
          )
          await interaction.reply({ embeds: [warningEmbed], flags: [64] }) // EPHEMERAL flag
          return
        }
      }

      timestamps?.set(interaction.user.id, now)
      setTimeout(() => timestamps?.delete(interaction.user.id), cooldownAmount)
    }

    // Increment command usage in database
    try {
      await client.database.incrementCommandUsage(interaction.commandName)

      // Also increment user's total commands
      await client.database.run("UPDATE users SET total_commands = total_commands + 1 WHERE user_id = ?", [
        interaction.user.id,
      ])
    } catch (error) {
      client.logger.error("Failed to update command statistics:", error)
    }

    // Execute the command
    try {
      await command.execute(interaction, client)
    } catch (error) {
      client.errorHandler.handle(error as Error, { interaction, command: interaction.commandName })
    }
  },
}
