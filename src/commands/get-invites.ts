import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type Message,
  EmbedBuilder,
  ChannelType,
  type TextChannel,
  type VoiceChannel,
  type NewsChannel,
  type StageChannel,
} from "discord.js"
import { botInfo } from "../utils/bot-info"
import { isDeveloper, logUnauthorizedAttempt } from "../utils/permissions"
import { logger } from "../utils/logger"

// Slash command definition
export const data = new SlashCommandBuilder()
  .setName("get-invites")
  .setDescription("Generates one-time use invites for all servers")

// Slash command execution
export async function execute(interaction: ChatInputCommandInteraction) {
  // Check if user is a developer
  if (!isDeveloper(interaction.user)) {
    logUnauthorizedAttempt(interaction.user.id, "get-invites")
    return interaction.reply({ content: "You don't have permission to use this command.", ephemeral: true })
  }

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

    // Create embeds (Discord has a limit on embed size, so we might need multiple)
    const embeds = []
    let currentEmbed = new EmbedBuilder()
      .setTitle("Server Invites")
      .setColor(botInfo.colors.primary)
      .setDescription("One-time use invites valid for 1 hour")
      .setFooter({ text: `Requested by ${interaction.user.tag}` })
      .setTimestamp()

    let fieldCount = 0
    const MAX_FIELDS = 25 // Discord's limit

    for (const result of results) {
      if (fieldCount >= MAX_FIELDS) {
        // Start a new embed if we've reached the field limit
        embeds.push(currentEmbed)
        currentEmbed = new EmbedBuilder()
          .setTitle("Server Invites (Continued)")
          .setColor(botInfo.colors.primary)
          .setFooter({ text: `Requested by ${interaction.user.tag}` })
          .setTimestamp()
        fieldCount = 0
      }

      currentEmbed.addFields({
        name: result.guild,
        value: result.invite || `Error: ${result.error}`,
        inline: true,
      })
      fieldCount++
    }

    embeds.push(currentEmbed)

    // Send the embeds
    await interaction.editReply({ embeds })
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

// Prefix command execution
export async function run(message: Message, args: string[]) {
  // Check if user is a developer
  if (!isDeveloper(message.author)) {
    logUnauthorizedAttempt(message.author.id, "get-invites")
    return message.reply("You don't have permission to use this command.")
  }

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

    // Create embeds (Discord has a limit on embed size, so we might need multiple)
    const embeds = []
    let currentEmbed = new EmbedBuilder()
      .setTitle("Server Invites")
      .setColor(botInfo.colors.primary)
      .setDescription("One-time use invites valid for 1 hour")
      .setFooter({ text: `Requested by ${message.author.tag}` })
      .setTimestamp()

    let fieldCount = 0
    const MAX_FIELDS = 25 // Discord's limit

    for (const result of results) {
      if (fieldCount >= MAX_FIELDS) {
        // Start a new embed if we've reached the field limit
        embeds.push(currentEmbed)
        currentEmbed = new EmbedBuilder()
          .setTitle("Server Invites (Continued)")
          .setColor(botInfo.colors.primary)
          .setFooter({ text: `Requested by ${message.author.tag}` })
          .setTimestamp()
        fieldCount = 0
      }

      currentEmbed.addFields({
        name: result.guild,
        value: result.invite || `Error: ${result.error}`,
        inline: true,
      })
      fieldCount++
    }

    embeds.push(currentEmbed)

    // Send the embeds
    await response.edit({ content: null, embeds })
    logger.info(`Sent ${results.length} server invites to ${message.author.tag}`)
  } catch (error) {
    logger.error("Error generating invites:", error)
    await response.edit("An error occurred while generating invites.")
  }
}