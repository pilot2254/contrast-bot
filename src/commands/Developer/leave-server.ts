import { SlashCommandBuilder, type ChatInputCommandInteraction, type Message, EmbedBuilder } from "discord.js"
import { botInfo } from "../../utils/bot-info"
import { isDeveloper, logUnauthorizedAttempt } from "../../utils/permissions"
import { logger } from "../../utils/logger"

// Slash command definition
export const data = new SlashCommandBuilder()
  .setName("leave-server")
  .setDescription("Makes the bot leave a server (Developer only)")
  .addStringOption((option) =>
    option.setName("server_id").setDescription("The ID of the server to leave").setRequired(true),
  )
  .addStringOption((option) =>
    option.setName("reason").setDescription("The reason for leaving the server").setRequired(false),
  )

// Slash command execution
export async function execute(interaction: ChatInputCommandInteraction) {
  // Check if user is a developer
  if (!isDeveloper(interaction.user)) {
    logUnauthorizedAttempt(interaction.user.id, "leave-server")
    return interaction.reply({ content: "You don't have permission to use this command.", ephemeral: true })
  }

  const serverId = interaction.options.getString("server_id", true)
  const reason = interaction.options.getString("reason") || "No reason provided"

  // Defer reply as this might take some time
  await interaction.deferReply({ ephemeral: true })

  try {
    // Try to fetch the guild
    const guild = await interaction.client.guilds.fetch(serverId).catch(() => null)

    if (!guild) {
      return interaction.editReply(`Could not find a server with ID ${serverId}.`)
    }

    // Confirm with server details
    const embed = new EmbedBuilder()
      .setTitle(`Leaving Server: ${guild.name}`)
      .setDescription(`The bot will leave this server.`)
      .setColor(botInfo.colors.warning)
      .addFields(
        { name: "Server ID", value: guild.id, inline: true },
        { name: "Member Count", value: guild.memberCount.toString(), inline: true },
        { name: "Reason", value: reason },
      )
      .setFooter({ text: `Requested by ${interaction.user.tag}` })
      .setTimestamp()

    // If the guild has an icon, add it to the embed
    if (guild.icon) {
      embed.setThumbnail(guild.iconURL({ size: 128 }) || "")
    }

    await interaction.editReply({ embeds: [embed] })

    // Log the action
    logger.info(`Leaving server ${guild.name} (${guild.id}) requested by ${interaction.user.tag}. Reason: ${reason}`)

    // Leave the guild
    await guild.leave()

    // Confirm the action
    await interaction.followUp({
      content: `Successfully left server ${guild.name} (${guild.id}).`,
      ephemeral: true,
    })
  } catch (error) {
    logger.error(`Error leaving server ${serverId}:`, error)
    await interaction.editReply(`An error occurred while trying to leave the server: ${error}`)
  }
}

// Prefix command definition
export const name = "leave-server"
export const aliases = ["leaveserver", "leave"]
export const description = "Makes the bot leave a server (Developer only)"
export const usage = "<server_id> [reason]"

// Prefix command execution
export async function run(message: Message, args: string[]) {
  // Check if user is a developer
  if (!isDeveloper(message.author)) {
    logUnauthorizedAttempt(message.author.id, "leave-server")
    return message.reply("You don't have permission to use this command.")
  }

  if (!args.length) {
    return message.reply(`Usage: ${usage}`)
  }

  const serverId = args[0]
  const reason = args.slice(1).join(" ") || "No reason provided"

  // Send initial response
  const response = await message.reply("Processing request...")

  try {
    // Try to fetch the guild
    const guild = await message.client.guilds.fetch(serverId).catch(() => null)

    if (!guild) {
      return response.edit(`Could not find a server with ID ${serverId}.`)
    }

    // Confirm with server details
    const embed = new EmbedBuilder()
      .setTitle(`Leaving Server: ${guild.name}`)
      .setDescription(`The bot will leave this server.`)
      .setColor(botInfo.colors.warning)
      .addFields(
        { name: "Server ID", value: guild.id, inline: true },
        { name: "Member Count", value: guild.memberCount.toString(), inline: true },
        { name: "Reason", value: reason },
      )
      .setFooter({ text: `Requested by ${message.author.tag}` })
      .setTimestamp()

    // If the guild has an icon, add it to the embed
    if (guild.icon) {
      embed.setThumbnail(guild.iconURL({ size: 128 }) || "")
    }

    await response.edit({ content: null, embeds: [embed] })

    // Log the action
    logger.info(`Leaving server ${guild.name} (${guild.id}) requested by ${message.author.tag}. Reason: ${reason}`)

    // Leave the guild
    await guild.leave()

    // Confirm the action - using response.edit instead of message.channel.send
    await response.edit({ content: `Successfully left server ${guild.name} (${guild.id}).`, embeds: [] })
  } catch (error) {
    logger.error(`Error leaving server ${serverId}:`, error)
    await response.edit(`An error occurred while trying to leave the server: ${error}`)
  }
}
