import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type Message,
  PermissionFlagsBits,
  ActivityType,
} from "discord.js"
import { config } from "../utils/config"
import dotenv from "dotenv"
import { logger } from "../utils/logger"
import { isDeveloper, logUnauthorizedAttempt } from "../utils/permissions"

// Slash command definition
export const data = new SlashCommandBuilder()
  .setName("reload")
  .setDescription("Reload the bot's configuration")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

// Slash command execution
export async function execute(interaction: ChatInputCommandInteraction) {
  // Check if user is a developer
  if (!isDeveloper(interaction.user)) {
    logUnauthorizedAttempt(interaction.user.id, "reload")
    return interaction.reply({ content: "You don't have permission to use this command.", ephemeral: true })
  }

  await reloadConfig(interaction.client)
  await interaction.reply({ content: "Configuration reloaded successfully!", ephemeral: true })
}

// Prefix command definition
export const name = "reload"
export const aliases = ["refresh"]
export const description = "Reload the bot's configuration"
export const category = "Developer"

// Prefix command execution
export async function run(message: Message, args: string[]) {
  // Check if user is a developer
  if (!isDeveloper(message.author)) {
    logUnauthorizedAttempt(message.author.id, "reload")
    return message.reply("You don't have permission to use this command.")
  }

  await reloadConfig(message.client)
  await message.reply("Configuration reloaded successfully!")
}

// Helper function to reload config
async function reloadConfig(client: any) {
  try {
    // Reload environment variables
    dotenv.config({ override: true })

    // Update config object
    config.prefix = process.env.PREFIX || "?"
    config.botName = process.env.BOT_NAME || "Contrast"

    // Get presence settings from environment
    const status = process.env.STATUS?.toLowerCase() || "online"
    const activityTypeStr = process.env.ACTIVITY_TYPE?.toUpperCase() || "PLAYING"
    const activityName = process.env.ACTIVITY_NAME || `with Discord.js`

    // Parse status
    let parsedStatus: "online" | "idle" | "dnd" | "invisible" = "online"
    if (["online", "idle", "dnd", "invisible"].includes(status)) {
      parsedStatus = status as "online" | "idle" | "dnd" | "invisible"
    }

    // Parse activity type
    let parsedActivityType: ActivityType = ActivityType.Playing
    switch (activityTypeStr) {
      case "PLAYING":
        parsedActivityType = ActivityType.Playing
        break
      case "STREAMING":
        parsedActivityType = ActivityType.Streaming
        break
      case "LISTENING":
        parsedActivityType = ActivityType.Listening
        break
      case "WATCHING":
        parsedActivityType = ActivityType.Watching
        break
      case "COMPETING":
        parsedActivityType = ActivityType.Competing
        break
    }

    // Update config
    config.presence.status = parsedStatus
    config.presence.activity.type = parsedActivityType
    config.presence.activity.name = activityName

    // First, set the status
    await client.user?.setStatus(parsedStatus)
    logger.info(`Status set to: ${parsedStatus}`)

    // Wait a moment before setting activity (helps with Discord API)
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // Set activity using the direct method that works in activity-test
    await client.user?.setActivity(activityName, { type: parsedActivityType })

    logger.info(`Activity set to: ${getActivityTypeName(parsedActivityType)} ${activityName}`)
    logger.info(`Using direct setActivity() method that works in activity-test`)

    // Note about invisible status
    if (parsedStatus === "invisible") {
      logger.info(
        "Note: Discord may show the bot as DND briefly before changing to invisible. This is normal behavior.",
      )
    }
  } catch (error) {
    logger.error("Failed to reload configuration:", error)
    throw error
  }
}

// Helper function to get activity type name
function getActivityTypeName(type: ActivityType): string {
  switch (type) {
    case ActivityType.Playing:
      return "Playing"
    case ActivityType.Streaming:
      return "Streaming"
    case ActivityType.Listening:
      return "Listening to"
    case ActivityType.Watching:
      return "Watching"
    case ActivityType.Custom:
      return "Custom"
    case ActivityType.Competing:
      return "Competing in"
    default:
      return "Playing"
  }
}