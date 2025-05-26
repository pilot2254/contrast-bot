import { SlashCommandBuilder, type ChatInputCommandInteraction, PermissionFlagsBits } from "discord.js"
import { isDeveloper } from "../../utils/permissions"
import { clearRateLimit } from "../../utils/rate-limiter"
import { logger } from "../../utils/logger"

export const data = new SlashCommandBuilder()
  .setName("clear-cooldown")
  .setDescription("Clear rate limit cooldowns for a user (Developer only)")
  .addUserOption((option) => option.setName("user").setDescription("The user to clear cooldowns for").setRequired(true))
  .addStringOption((option) =>
    option.setName("command").setDescription("Specific command to clear (optional)").setRequired(false),
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!isDeveloper(interaction.user)) {
    await interaction.reply({
      content: "❌ This command is only available to developers.",
      ephemeral: true,
    })
    return
  }

  const targetUser = interaction.options.getUser("user", true)
  const command = interaction.options.getString("command")

  try {
    clearRateLimit(targetUser.id, command || undefined)

    const message = command
      ? `✅ Cleared cooldown for **${command}** command for ${targetUser.tag}`
      : `✅ Cleared all cooldowns for ${targetUser.tag}`

    await interaction.reply({
      content: message,
      ephemeral: true,
    })

    logger.info(`${interaction.user.tag} cleared cooldowns for ${targetUser.tag}${command ? ` (${command})` : ""}`)
  } catch (error) {
    logger.error("Error clearing cooldown:", error)
    await interaction.reply({
      content: "❌ Failed to clear cooldown.",
      ephemeral: true,
    })
  }
}
