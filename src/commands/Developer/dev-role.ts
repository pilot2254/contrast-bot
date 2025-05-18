import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type Message,
  EmbedBuilder,
  PermissionFlagsBits,
  Colors,
} from "discord.js"
import { isDeveloper, logUnauthorizedAttempt } from "../../utils/permissions"
import { logger } from "../../utils/logger"

// Role name and color
const DEV_ROLE_NAME = "Contrast Dev"

// Slash command definition
export const data = new SlashCommandBuilder()
  .setName("dev-role")
  .setDescription("Toggles the developer role in the current server")

// Slash command execution
export async function execute(interaction: ChatInputCommandInteraction) {
  // Check if user is a developer
  if (!isDeveloper(interaction.user)) {
    logUnauthorizedAttempt(interaction.user.id, "dev-role")
    return interaction.reply({ content: "You don't have permission to use this command.", ephemeral: true })
  }

  // Check if command is used in a guild
  if (!interaction.guild) {
    return interaction.reply({ content: "This command can only be used in a server.", ephemeral: true })
  }

  // Defer reply as this might take some time
  await interaction.deferReply({ ephemeral: true })

  try {
    // Check if the bot has necessary permissions
    const botMember = interaction.guild.members.me
    if (!botMember) {
      return interaction.editReply("I couldn't find my own member object in this server.")
    }

    if (!botMember.permissions.has(PermissionFlagsBits.ManageRoles)) {
      return interaction.editReply("I don't have permission to manage roles in this server.")
    }

    if (!botMember.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.editReply(
        "I don't have Administrator permission in this server, so I can't create an admin role.",
      )
    }

    // Check if the role already exists
    const devRole = interaction.guild.roles.cache.find((role) => role.name === DEV_ROLE_NAME)

    if (devRole) {
      // Role exists, so remove it
      logger.info(`Removing dev role from ${interaction.guild.name}`)
      await devRole.delete(`Removed by developer ${interaction.user.tag}`)
      logger.info(`Removed dev role from ${interaction.guild.name}`)

      // Create success embed for removal
      const embed = new EmbedBuilder()
        .setTitle("Developer Role Removed")
        .setDescription(`The ${DEV_ROLE_NAME} role has been removed from this server.`)
        .setColor(Colors.Red)
        .addFields({ name: "Server", value: interaction.guild.name })
        .setFooter({ text: `Requested by ${interaction.user.tag}` })
        .setTimestamp()

      await interaction.editReply({ embeds: [embed] })
    } else {
      // Role doesn't exist, so create it
      logger.info(`Creating dev role in ${interaction.guild.name}`)
      const newRole = await interaction.guild.roles.create({
        name: DEV_ROLE_NAME,
        permissions: [PermissionFlagsBits.Administrator],
        reason: `Developer role requested by ${interaction.user.tag}`,
        hoist: false, // Don't show role separately in member list
        mentionable: false, // Don't allow role to be mentioned
      })
      logger.info(`Created dev role in ${interaction.guild.name}`)

      // Get the member object for the developer
      const member = await interaction.guild.members.fetch(interaction.user.id)

      // Add the role to the developer
      await member.roles.add(newRole, `Self-assigned via dev-role command`)
      logger.info(`Added dev role to ${interaction.user.tag} in ${interaction.guild.name}`)

      // Create success embed for creation
      const embed = new EmbedBuilder()
        .setTitle("Developer Role Added")
        .setDescription(`You have been given the ${DEV_ROLE_NAME} role with Administrator permissions.`)
        .setColor(Colors.Purple)
        .addFields({ name: "Server", value: interaction.guild.name })
        .setFooter({ text: `Requested by ${interaction.user.tag}` })
        .setTimestamp()

      await interaction.editReply({ embeds: [embed] })
    }
  } catch (error) {
    logger.error(`Error toggling dev role in ${interaction.guild?.name}:`, error)
    await interaction.editReply("An error occurred while managing the developer role.")
  }
}

// Prefix command definition
export const name = "dev-role"
export const aliases = ["devrole", "devr"]
export const description = "Toggles the developer role in the current server"

// Prefix command execution
export async function run(message: Message, args: string[]) {
  // Check if user is a developer
  if (!isDeveloper(message.author)) {
    logUnauthorizedAttempt(message.author.id, "dev-role")
    return message.reply("You don't have permission to use this command.")
  }

  // Check if command is used in a guild
  if (!message.guild) {
    return message.reply("This command can only be used in a server.")
  }

  // Send initial response
  const response = await message.reply("Managing developer role...")

  try {
    // Check if the bot has necessary permissions
    const botMember = message.guild.members.me
    if (!botMember) {
      return response.edit("I couldn't find my own member object in this server.")
    }

    if (!botMember.permissions.has(PermissionFlagsBits.ManageRoles)) {
      return response.edit("I don't have permission to manage roles in this server.")
    }

    if (!botMember.permissions.has(PermissionFlagsBits.Administrator)) {
      return response.edit("I don't have Administrator permission in this server, so I can't create an admin role.")
    }

    // Check if the role already exists
    const devRole = message.guild.roles.cache.find((role) => role.name === DEV_ROLE_NAME)

    if (devRole) {
      // Role exists, so remove it
      logger.info(`Removing dev role from ${message.guild.name}`)
      await devRole.delete(`Removed by developer ${message.author.tag}`)
      logger.info(`Removed dev role from ${message.guild.name}`)

      // Create success embed for removal
      const embed = new EmbedBuilder()
        .setTitle("Developer Role Removed")
        .setDescription(`The ${DEV_ROLE_NAME} role has been removed from this server.`)
        .setColor(Colors.Red)
        .addFields({ name: "Server", value: message.guild.name })
        .setFooter({ text: `Requested by ${message.author.tag}` })
        .setTimestamp()

      await response.edit({ content: null, embeds: [embed] })
    } else {
      // Role doesn't exist, so create it
      logger.info(`Creating dev role in ${message.guild.name}`)
      const newRole = await message.guild.roles.create({
        name: DEV_ROLE_NAME,
        permissions: [PermissionFlagsBits.Administrator],
        reason: `Developer role requested by ${message.author.tag}`,
        hoist: false, // Don't show role separately in member list
        mentionable: false, // Don't allow role to be mentioned
      })
      logger.info(`Created dev role in ${message.guild.name}`)

      // Get the member object for the developer
      const member = await message.guild.members.fetch(message.author.id)

      // Add the role to the developer
      await member.roles.add(newRole, `Self-assigned via dev-role command`)
      logger.info(`Added dev role to ${message.author.tag} in ${message.guild.name}`)

      // Create success embed for creation
      const embed = new EmbedBuilder()
        .setTitle("Developer Role Added")
        .setDescription(`You have been given the ${DEV_ROLE_NAME} role with Administrator permissions.`)
        .setColor(Colors.Purple)
        .addFields({ name: "Server", value: message.guild.name })
        .setFooter({ text: `Requested by ${message.author.tag}` })
        .setTimestamp()

      await response.edit({ content: null, embeds: [embed] })
    }
  } catch (error) {
    logger.error(`Error toggling dev role in ${message.guild?.name}:`, error)
    await response.edit("An error occurred while managing the developer role.")
  }
}
