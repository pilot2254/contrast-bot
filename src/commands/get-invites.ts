import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type Message,
  ChannelType,
  type TextChannel,
  type VoiceChannel,
  type NewsChannel,
  type StageChannel,
  AttachmentBuilder,
} from "discord.js"
import { isDeveloper, logUnauthorizedAttempt } from "../utils/permissions"
import { logger } from "../utils/logger"

// Slash command definition
export const data = new SlashCommandBuilder()
  .setName("get-invites")
  .setDescription("Generates one-time use invites for all servers")
  .addBooleanOption((option) =>
    option.setName("as_file").setDescription("Send the invites as a .txt file").setRequired(false),
  )

// Slash command execution
export async function execute(interaction: ChatInputCommandInteraction) {
  // Check if user is a developer
  if (!isDeveloper(interaction.user)) {
    logUnauthorizedAttempt(interaction.user.id, "get-invites")
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

    logger.info(`Generating invites for ${guilds.size} servers`)

    // Create an array to store results
    const results: { guild: string; invite?: string; error?: string }[] = []

    // Process each guild
    for (const [, guild] of guilds) {
      try {
        // Find the first text channel we can create an invite in
        const channels = guild.channels.cache
        let invite = null

        // Try to find a suitable channel for invite creation
        for (const [, channel] of channels) {
          // Check if it's a channel type that supports invites
          if (
            (channel.type === ChannelType.GuildText ||
              channel.type === ChannelType.GuildVoice ||
              channel.type === ChannelType.GuildNews ||
              channel.type === ChannelType.GuildStageVoice) &&
            channel.permissionsFor(guild.members.me!)?.has("CreateInstantInvite")
          ) {
            try {
              // Type assertion to ensure TypeScript knows this channel supports createInvite
              const inviteChannel = channel as TextChannel | VoiceChannel | NewsChannel | StageChannel

              // Create a single-use invite that expires in 1 hour
              invite = await inviteChannel.createInvite({
                maxUses: 1,
                maxAge: 3600, // 1 hour in seconds
                unique: true,
                reason: `Invite requested by developer ${interaction.user.tag}`,
              })
              break // Stop once we've created an invite
            } catch (channelError) {
              // Continue to the next channel if this one fails
              continue
            }
          }
        }

        if (invite) {
          results.push({
            guild: guild.name,
            invite: invite.url,
          })
        } else {
          results.push({
            guild: guild.name,
            error: "No suitable channel found or missing permissions",
          })
        }
      } catch (guildError) {
        results.push({
          guild: guild.name,
          error: "Failed to create invite",
        })
        logger.error(`Error creating invite for ${guild.name}:`, guildError)
      }
    }

    // Format the results as text
    let formattedText = `Server Invites (${results.length})\n`
    formattedText += `Generated at: ${new Date().toISOString()}\n`
    formattedText += `Requested by: ${interaction.user.tag}\n\n`

    results.forEach((result) => {
      formattedText += `${result.guild}\n`
      formattedText += result.invite ? result.invite : `Error: ${result.error}`
      formattedText += "\n\n"
    })

    if (asFile) {
      // Send as a text file
      const buffer = Buffer.from(formattedText, "utf-8")
      const attachment = new AttachmentBuilder(buffer, { name: "server-invites.txt" })

      await interaction.editReply({
        content: `Generated invites for ${results.length} servers.`,
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

    logger.info(`Sent ${results.length} server invites to ${interaction.user.tag}`)
  } catch (error) {
    logger.error("Error generating invites:", error)
    await interaction.editReply("An error occurred while generating invites.")
  }
}

// Prefix command definition
export const name = "get-invites"
export const aliases = ["invites", "server-invites"]
export const description = "Generates one-time use invites for all servers"
export const category = "Developer"
export const usage = "[as_file]"

// Prefix command execution
export async function run(message: Message, args: string[]) {
  // Check if user is a developer
  if (!isDeveloper(message.author)) {
    logUnauthorizedAttempt(message.author.id, "get-invites")
    return message.reply("You don't have permission to use this command.")
  }

  // Check if the user wants the output as a file
  const asFile = args[0]?.toLowerCase() === "file" || args[0]?.toLowerCase() === "txt"

  // Send initial response
  const response = await message.reply("Generating invites for all servers...")

  try {
    // Get all guilds the bot is in
    const guilds = message.client.guilds.cache

    if (guilds.size === 0) {
      return response.edit("I'm not in any servers.")
    }

    logger.info(`Generating invites for ${guilds.size} servers`)

    // Create an array to store results
    const results: { guild: string; invite?: string; error?: string }[] = []

    // Process each guild
    for (const [, guild] of guilds) {
      try {
        // Find the first text channel we can create an invite in
        const channels = guild.channels.cache
        let invite = null

        // Try to find a suitable channel for invite creation
        for (const [, channel] of channels) {
          // Check if it's a channel type that supports invites
          if (
            (channel.type === ChannelType.GuildText ||
              channel.type === ChannelType.GuildVoice ||
              channel.type === ChannelType.GuildNews ||
              channel.type === ChannelType.GuildStageVoice) &&
            channel.permissionsFor(guild.members.me!)?.has("CreateInstantInvite")
          ) {
            try {
              // Type assertion to ensure TypeScript knows this channel supports createInvite
              const inviteChannel = channel as TextChannel | VoiceChannel | NewsChannel | StageChannel

              // Create a single-use invite that expires in 1 hour
              invite = await inviteChannel.createInvite({
                maxUses: 1,
                maxAge: 3600, // 1 hour in seconds
                unique: true,
                reason: `Invite requested by developer ${message.author.tag}`,
              })
              break // Stop once we've created an invite
            } catch (channelError) {
              // Continue to the next channel if this one fails
              continue
            }
          }
        }

        if (invite) {
          results.push({
            guild: guild.name,
            invite: invite.url,
          })
        } else {
          results.push({
            guild: guild.name,
            error: "No suitable channel found or missing permissions",
          })
        }
      } catch (guildError) {
        results.push({
          guild: guild.name,
          error: "Failed to create invite",
        })
        logger.error(`Error creating invite for ${guild.name}:`, guildError)
      }
    }

    // Format the results as text
    let formattedText = `Server Invites (${results.length})\n`
    formattedText += `Generated at: ${new Date().toISOString()}\n`
    formattedText += `Requested by: ${message.author.tag}\n\n`

    results.forEach((result) => {
      formattedText += `${result.guild}\n`
      formattedText += result.invite ? result.invite : `Error: ${result.error}`
      formattedText += "\n\n"
    })

    if (asFile) {
      // Send as a text file
      const buffer = Buffer.from(formattedText, "utf-8")
      const attachment = new AttachmentBuilder(buffer, { name: "server-invites.txt" })

      await response.edit({
        content: `Generated invites for ${results.length} servers.`,
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

    logger.info(`Sent ${results.length} server invites to ${message.author.tag}`)
  } catch (error) {
    logger.error("Error generating invites:", error)
    await response.edit("An error occurred while generating invites.")
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