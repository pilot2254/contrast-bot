import { SlashCommandBuilder, type ChatInputCommandInteraction, type Message, AttachmentBuilder } from "discord.js"
import { isDeveloper, logUnauthorizedAttempt } from "../../utils/permissions"
import { logger } from "../../utils/logger"

// Slash command definition
export const data = new SlashCommandBuilder()
  .setName("server-list")
  .setDescription("Lists all servers the bot is in (Developer only)")
  .addBooleanOption((option) =>
    option.setName("as_file").setDescription("Send the server list as a .txt file").setRequired(false),
  )

// Slash command execution
export async function execute(interaction: ChatInputCommandInteraction) {
  // Check if user is a developer
  if (!isDeveloper(interaction.user)) {
    logUnauthorizedAttempt(interaction.user.id, "server-list")
    return interaction.reply({ content: "You don't have permission to use this command.", ephemeral: true })
  }

  // Get option for file output
  const asFile = interaction.options.getBoolean("as_file") || false

  // Defer reply as this might take some time
  await interaction.deferReply({ ephemeral: true })

  try {
    // Get all guilds the bot is in
    const guilds = interaction.client.guilds.cache

    if (guilds.size === 0) {
      return interaction.editReply("I'm not in any servers.")
    }

    logger.info(`Listing ${guilds.size} servers for ${interaction.user.tag}`)

    // Format the results as text
    let formattedText = `Server List (${guilds.size})\n`
    formattedText += `Generated at: ${new Date().toISOString()}\n`
    formattedText += `Requested by: ${interaction.user.tag}\n\n`

    // Sort guilds by member count (descending)
    const sortedGuilds = [...guilds.values()].sort((a, b) => b.memberCount - a.memberCount)

    sortedGuilds.forEach((guild) => {
      formattedText += `${guild.name}\n`
      formattedText += `ID: ${guild.id}\n`
      formattedText += `Members: ${guild.memberCount}\n`
      formattedText += `Owner ID: ${guild.ownerId}\n`
      formattedText += `Created: ${new Date(guild.createdTimestamp).toISOString()}\n`
      formattedText += "\n"
    })

    if (asFile) {
      // Send as a text file
      const buffer = Buffer.from(formattedText, "utf-8")
      const attachment = new AttachmentBuilder(buffer, { name: "server-list.txt" })

      await interaction.editReply({
        content: `Listed ${guilds.size} servers.`,
        files: [attachment],
      })
    } else {
      // Send as a message
      // Discord has a 2000 character limit, so we might need to split the message
      if (formattedText.length <= 2000) {
        await interaction.editReply({
          content: formattedText,
        })
      } else {
        // Split into multiple messages if too long
        const chunks = splitMessage(formattedText)
        await interaction.editReply({
          content: chunks[0],
        })

        // Send additional chunks as follow-up messages
        for (let i = 1; i < chunks.length; i++) {
          await interaction.followUp({
            content: chunks[i],
            ephemeral: true,
          })
        }
      }
    }

    logger.info(`Sent server list to ${interaction.user.tag}`)
  } catch (error) {
    logger.error("Error listing servers:", error)
    await interaction.editReply("An error occurred while listing servers.")
  }
}

// Prefix command definition
export const name = "server-list"
export const aliases = ["servers", "listservers"]
export const description = "Lists all servers the bot is in (Developer only)"
export const usage = "[as_file]"

// Prefix command execution
export async function run(message: Message, args: string[]) {
  // Check if user is a developer
  if (!isDeveloper(message.author)) {
    logUnauthorizedAttempt(message.author.id, "server-list")
    return message.reply("You don't have permission to use this command.")
  }

  // Check if the user wants the output as a file
  const asFile = args[0]?.toLowerCase() === "file" || args[0]?.toLowerCase() === "txt"

  // Send initial response
  const response = await message.reply("Listing servers...")

  try {
    // Get all guilds the bot is in
    const guilds = message.client.guilds.cache

    if (guilds.size === 0) {
      return response.edit("I'm not in any servers.")
    }

    logger.info(`Listing ${guilds.size} servers for ${message.author.tag}`)

    // Format the results as text
    let formattedText = `Server List (${guilds.size})\n`
    formattedText += `Generated at: ${new Date().toISOString()}\n`
    formattedText += `Requested by: ${message.author.tag}\n\n`

    // Sort guilds by member count (descending)
    const sortedGuilds = [...guilds.values()].sort((a, b) => b.memberCount - a.memberCount)

    sortedGuilds.forEach((guild) => {
      formattedText += `${guild.name}\n`
      formattedText += `ID: ${guild.id}\n`
      formattedText += `Members: ${guild.memberCount}\n`
      formattedText += `Owner ID: ${guild.ownerId}\n`
      formattedText += `Created: ${new Date(guild.createdTimestamp).toISOString()}\n`
      formattedText += "\n"
    })

    if (asFile) {
      // Send as a text file
      const buffer = Buffer.from(formattedText, "utf-8")
      const attachment = new AttachmentBuilder(buffer, { name: "server-list.txt" })

      await response.edit({
        content: `Listed ${guilds.size} servers.`,
        files: [attachment],
      })
    } else {
      // Send as a message
      // Discord has a 2000 character limit, so we might need to split the message
      if (formattedText.length <= 2000) {
        await response.edit(formattedText)
      } else {
        // Split into multiple messages if too long
        const chunks = splitMessage(formattedText)
        await response.edit(chunks[0])

        // Send additional chunks as follow-up messages
        for (let i = 1; i < chunks.length; i++) {
          // Check if the channel supports sending messages
          if ("send" in message.channel) {
            await message.channel.send(chunks[i])
          } else {
            logger.error("Cannot send follow-up message: channel does not support send method")
          }
        }
      }
    }

    logger.info(`Sent server list to ${message.author.tag}`)
  } catch (error) {
    logger.error("Error listing servers:", error)
    await response.edit("An error occurred while listing servers.")
  }
}

// Helper function to split messages that exceed Discord's character limit
function splitMessage(text: string, maxLength = 2000): string[] {
  const chunks: string[] = []

  while (text.length > 0) {
    let chunk = text.substring(0, maxLength)

    // Try to split at a newline to avoid cutting in the middle of a line
    if (text.length > maxLength) {
      const lastNewline = chunk.lastIndexOf("\n\n")
      if (lastNewline > 0) {
        chunk = chunk.substring(0, lastNewline + 2)
      }
    }

    chunks.push(chunk)
    text = text.substring(chunk.length)
  }

  return chunks
}
