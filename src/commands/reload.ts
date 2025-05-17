import { SlashCommandBuilder, type ChatInputCommandInteraction, type Message, PermissionFlagsBits } from "discord.js"
import { config } from "../utils/config"
import dotenv from "dotenv"
import { logger } from "../utils/logger"

// Slash command definition
export const data = new SlashCommandBuilder()
  .setName("reload")
  .setDescription("Reload the bot's configuration")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

// Slash command execution
export async function execute(interaction: ChatInputCommandInteraction) {
  await reloadConfig(interaction.client)
  await interaction.reply({ content: "Configuration reloaded successfully!", ephemeral: true })
}

// Prefix command definition
export const name = "reload"
export const aliases = ["refresh"]
export const description = "Reload the bot's configuration"
export const category = "Admin"

// Prefix command execution
export async function run(message: Message, args: string[]) {
  // Check if user has admin permissions
  if (!message.member?.permissions.has(PermissionFlagsBits.Administrator)) {
    return message.reply("You need Administrator permissions to use this command.")
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

    // Update presence settings
    const status = process.env.STATUS?.toLowerCase() || "online"
    const activityType = process.env.ACTIVITY_TYPE?.toUpperCase() || "PLAYING"
    const activityName = process.env.ACTIVITY_NAME || `as ${process.env.BOT_NAME || "Contrast"}`
    const activityUrl = process.env.ACTIVITY_URL

    // Parse status
    let parsedStatus: "online" | "idle" | "dnd" | "invisible" = "online"
    if (["online", "idle", "dnd", "invisible"].includes(status)) {
      parsedStatus = status as "online" | "idle" | "dnd" | "invisible"
    }

    // Parse activity type
    let parsedActivityType = 0 // Playing
    switch (activityType) {
      case "PLAYING":
        parsedActivityType = 0
        break
      case "STREAMING":
        parsedActivityType = 1
        break
      case "LISTENING":
        parsedActivityType = 2
        break
      case "WATCHING":
        parsedActivityType = 3
        break
      case "COMPETING":
        parsedActivityType = 5
        break
    }

    // Update config
    config.presence.status = parsedStatus
    config.presence.activity.type = parsedActivityType
    config.presence.activity.name = activityName
    config.presence.activity.url = activityUrl

    // Update bot presence
    await client.user?.setPresence({
      status: parsedStatus,
      activities: [
        {
          name: activityName,
          type: parsedActivityType,
          url: activityUrl,
        },
      ],
    })

    logger.info("Configuration reloaded successfully")
    logger.info(`Status: ${parsedStatus} | Activity: ${getActivityTypeName(parsedActivityType)} ${activityName}`)
  } catch (error) {
    logger.error("Failed to reload configuration:", error)
    throw error
  }
}

// Helper function to get activity type name
function getActivityTypeName(type: number): string {
  switch (type) {
    case 0:
      return "Playing"
    case 1:
      return "Streaming"
    case 2:
      return "Listening to"
    case 3:
      return "Watching"
    case 4:
      return "Custom"
    case 5:
      return "Competing in"
    default:
      return "Playing"
  }
}