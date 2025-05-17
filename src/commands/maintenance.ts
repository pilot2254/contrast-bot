import { SlashCommandBuilder, type ChatInputCommandInteraction, type Message, EmbedBuilder } from "discord.js"
import { botInfo } from "../utils/bot-info"
import { isDeveloper, logUnauthorizedAttempt } from "../utils/permissions"
import { setMaintenanceMode, isMaintenanceMode } from "../utils/blacklist-manager"
import { logger } from "../utils/logger"

// Slash command definition
export const data = new SlashCommandBuilder()
  .setName("maintenance")
  .setDescription("Toggles maintenance mode")
  .addBooleanOption((option) =>
    option.setName("enabled").setDescription("Whether maintenance mode should be enabled").setRequired(false),
  )

// Slash command execution
export async function execute(interaction: ChatInputCommandInteraction) {
  // Direct ID check as a fallback
  const userId = String(interaction.user.id).trim()
  logger.info(`Maintenance command attempted by user ID: "${userId}"`)

  // Check if user is a developer using both methods
  const isDev = isDeveloper(interaction.user) || userId === "171395713064894465"

  if (!isDev) {
    logUnauthorizedAttempt(userId, "maintenance")
    logger.warn(`Permission denied for maintenance command. User ID: ${userId}`)
    return interaction.reply({ content: "You don't have permission to use this command.", ephemeral: true })
  }

  logger.info(`Maintenance command authorized for user ${userId}`)

  const enabled = interaction.options.getBoolean("enabled")
  const currentMode = isMaintenanceMode()

  // If no option provided, toggle the current mode
  const newMode = enabled !== null ? enabled : !currentMode
  setMaintenanceMode(newMode)

  const embed = new EmbedBuilder()
    .setTitle("Maintenance Mode")
    .setDescription(`Maintenance mode has been ${newMode ? "enabled" : "disabled"}.`)
    .setColor(newMode ? botInfo.colors.warning : botInfo.colors.success)
    .addFields({
      name: "Status",
      value: newMode ? "Only developers can use commands" : "All users can use commands",
    })
    .setFooter({ text: `Requested by ${interaction.user.tag}` })
    .setTimestamp()

  await interaction.reply({ embeds: [embed], ephemeral: true })
}

// Prefix command definition
export const name = "maintenance"
export const aliases = ["maint"]
export const description = "Toggles maintenance mode"
export const category = "Developer"
export const usage = "[on/off]"

// Prefix command execution
export async function run(message: Message, args: string[]) {
  // Direct ID check as a fallback
  const userId = String(message.author.id).trim()
  logger.info(`Maintenance command attempted by user ID: "${userId}"`)

  // Check if user is a developer using both methods
  const isDev = isDeveloper(message.author) || userId === "171395713064894465"

  if (!isDev) {
    logUnauthorizedAttempt(userId, "maintenance")
    logger.warn(`Permission denied for maintenance command. User ID: ${userId}`)
    return message.reply("You don't have permission to use this command.")
  }

  logger.info(`Maintenance command authorized for user ${userId}`)

  const currentMode = isMaintenanceMode()
  let newMode = !currentMode

  if (args.length > 0) {
    const arg = args[0].toLowerCase()
    if (arg === "on" || arg === "enable" || arg === "true" || arg === "1") {
      newMode = true
    } else if (arg === "off" || arg === "disable" || arg === "false" || arg === "0") {
      newMode = false
    }
  }

  setMaintenanceMode(newMode)

  const embed = new EmbedBuilder()
    .setTitle("Maintenance Mode")
    .setDescription(`Maintenance mode has been ${newMode ? "enabled" : "disabled"}.`)
    .setColor(newMode ? botInfo.colors.warning : botInfo.colors.success)
    .addFields({
      name: "Status",
      value: newMode ? "Only developers can use commands" : "All users can use commands",
    })
    .setFooter({ text: `Requested by ${message.author.tag}` })
    .setTimestamp()

  await message.reply({ embeds: [embed] })
}