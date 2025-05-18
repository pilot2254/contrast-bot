import { SlashCommandBuilder, type ChatInputCommandInteraction, type Message, EmbedBuilder } from "discord.js"
import { botInfo } from "../../utils/bot-info"
import { isDeveloper, logUnauthorizedAttempt } from "../../utils/permissions"
import { logger } from "../../utils/logger"
import fs from "fs"
import path from "path"

// Slash command definition
export const data = new SlashCommandBuilder()
  .setName("data")
  .setDescription("Lists JSON data files in the data directory")

// Slash command execution
export async function execute(interaction: ChatInputCommandInteraction) {
  // Direct ID check as a fallback
  const userId = String(interaction.user.id).trim()
  logger.info(`Data command attempted by user ID: "${userId}"`)

  // Check if user is a developer using both methods
  const isDev = isDeveloper(interaction.user) || userId === "171395713064894465"

  if (!isDev) {
    logUnauthorizedAttempt(userId, "data")
    logger.warn(`Permission denied for data command. User ID: ${userId}`)
    return interaction.reply({ content: "You don't have permission to use this command.", ephemeral: true })
  }

  logger.info(`Data command authorized for user ${userId}`)

  const dataDir = path.join(process.cwd(), "data")

  try {
    if (!fs.existsSync(dataDir)) {
      return interaction.reply({ content: "Data directory does not exist yet.", ephemeral: true })
    }

    // Get only JSON files
    const files = fs.readdirSync(dataDir).filter((file) => file.endsWith(".json"))

    if (files.length === 0) {
      return interaction.reply({ content: "No JSON data files found.", ephemeral: true })
    }

    const fileDetails = files.map((file) => {
      const filePath = path.join(dataDir, file)
      const stats = fs.statSync(filePath)
      return {
        name: file,
        size: formatBytes(stats.size),
      }
    })

    const embed = new EmbedBuilder()
      .setTitle("JSON Data Files")
      .setColor(botInfo.colors.primary)
      .setDescription("List of all JSON data files in the data directory")
      .addFields(
        fileDetails.map((file) => ({
          name: file.name,
          value: `Size: ${file.size}`,
          inline: true,
        })),
      )
      .setFooter({ text: `Requested by ${interaction.user.tag}` })
      .setTimestamp()

    await interaction.reply({ embeds: [embed], ephemeral: true })
  } catch (error) {
    logger.error("Error listing data files:", error)
    await interaction.reply({ content: "An error occurred while listing data files.", ephemeral: true })
  }
}

// Prefix command definition
export const name = "data"
export const aliases = ["datafiles", "files"]
export const description = "Lists JSON data files in the data directory"

// Prefix command execution
export async function run(message: Message, _args: string[]) {
  // Direct ID check as a fallback
  const userId = String(message.author.id).trim()
  logger.info(`Data command attempted by user ID: "${userId}"`)

  // Check if user is a developer using both methods
  const isDev = isDeveloper(message.author) || userId === "171395713064894465"

  if (!isDev) {
    logUnauthorizedAttempt(userId, "data")
    logger.warn(`Permission denied for data command. User ID: ${userId}`)
    return message.reply("You don't have permission to use this command.")
  }

  logger.info(`Data command authorized for user ${userId}`)

  const dataDir = path.join(process.cwd(), "data")

  try {
    if (!fs.existsSync(dataDir)) {
      return message.reply("Data directory does not exist yet.")
    }

    // Get only JSON files
    const files = fs.readdirSync(dataDir).filter((file) => file.endsWith(".json"))

    if (files.length === 0) {
      return message.reply("No JSON data files found.")
    }

    const fileDetails = files.map((file) => {
      const filePath = path.join(dataDir, file)
      const stats = fs.statSync(filePath)
      return {
        name: file,
        size: formatBytes(stats.size),
      }
    })

    const embed = new EmbedBuilder()
      .setTitle("JSON Data Files")
      .setColor(botInfo.colors.primary)
      .setDescription("List of all JSON data files in the data directory")
      .addFields(
        fileDetails.map((file) => ({
          name: file.name,
          value: `Size: ${file.size}`,
          inline: true,
        })),
      )
      .setFooter({ text: `Requested by ${message.author.tag}` })
      .setTimestamp()

    await message.reply({ embeds: [embed] })
  } catch (error) {
    logger.error("Error listing data files:", error)
    await message.reply("An error occurred while listing data files.")
  }
}

// Helper function to format bytes
function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return "0 Bytes"

  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"]

  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i]
}
