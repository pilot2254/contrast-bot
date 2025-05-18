import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type Message,
  PermissionFlagsBits,
  EmbedBuilder,
} from "discord.js"
import { botInfo } from "../../utils/bot-info"

// Slash command definition
export const data = new SlashCommandBuilder()
  .setName("kick")
  .setDescription("Kicks a user from the server")
  .addUserOption((option) => option.setName("user").setDescription("The user to kick").setRequired(true))
  .addStringOption((option) =>
    option.setName("reason").setDescription("The reason for kicking the user").setRequired(false),
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)

// Slash command execution
export async function execute(interaction: ChatInputCommandInteraction) {
  if (!interaction.guild) {
    return interaction.reply({
      content: "This command can only be used in a server.",
      ephemeral: true,
    })
  }

  // Check bot permissions
  if (!interaction.guild.members.me?.permissions.has(PermissionFlagsBits.KickMembers)) {
    return interaction.reply({
      content: "I don't have permission to kick members.",
      ephemeral: true,
    })
  }

  const targetUser = interaction.options.getUser("user")
  if (!targetUser) {
    return interaction.reply({
      content: "You need to specify a user to kick.",
      ephemeral: true,
    })
  }

  const reason = interaction.options.getString("reason") || "No reason provided"

  try {
    const targetMember = await interaction.guild.members.fetch(targetUser.id)

    // Check if the target is kickable
    if (!targetMember.kickable) {
      return interaction.reply({
        content: "I cannot kick this user. They may have higher permissions than me.",
        ephemeral: true,
      })
    }

    // Check if the user is trying to kick themselves
    if (targetUser.id === interaction.user.id) {
      return interaction.reply({
        content: "You cannot kick yourself.",
        ephemeral: true,
      })
    }

    // Kick the user
    await targetMember.kick(reason)

    const embed = new EmbedBuilder()
      .setTitle("User Kicked")
      .setDescription(`${targetUser.tag} has been kicked from the server.`)
      .setColor(botInfo.colors.warning)
      .addFields({ name: "Reason", value: reason })
      .setFooter({ text: `Kicked by ${interaction.user.tag}` })
      .setTimestamp()

    await interaction.reply({ embeds: [embed] })
  } catch (error) {
    console.error("Error kicking user:", error)
    await interaction.reply({
      content: "There was an error trying to kick this user.",
      ephemeral: true,
    })
  }
}

// Prefix command definition
export const name = "kick"
export const description = "Kicks a user from the server"
export const usage = "<user> [reason]"

// Prefix command execution
export async function run(message: Message, args: string[]) {
  if (!message.guild) {
    return message.reply("This command can only be used in a server.")
  }

  // Check user permissions
  if (!message.member?.permissions.has(PermissionFlagsBits.KickMembers)) {
    return message.reply("You don't have permission to kick members.")
  }

  // Check bot permissions
  if (!message.guild.members.me?.permissions.has(PermissionFlagsBits.KickMembers)) {
    return message.reply("I don't have permission to kick members.")
  }

  if (!args[0]) {
    return message.reply("You need to specify a user to kick.")
  }

  let targetUser
  try {
    // Try to get user from mention, ID, or username
    targetUser =
      message.mentions.users.first() ||
      (await message.client.users.fetch(args[0])) ||
      message.guild.members.cache.find(
        (m) =>
          m.user.username.toLowerCase() === args[0].toLowerCase() ||
          (m.nickname && m.nickname.toLowerCase() === args[0].toLowerCase()),
      )?.user
  } catch (error) {
    return message.reply("Could not find that user.")
  }

  if (!targetUser) {
    return message.reply("Could not find that user.")
  }

  const reason = args.slice(1).join(" ") || "No reason provided"

  try {
    const targetMember = await message.guild.members.fetch(targetUser.id)

    // Check if the target is kickable
    if (!targetMember.kickable) {
      return message.reply("I cannot kick this user. They may have higher permissions than me.")
    }

    // Check if the user is trying to kick themselves
    if (targetUser.id === message.author.id) {
      return message.reply("You cannot kick yourself.")
    }

    // Kick the user
    await targetMember.kick(reason)

    const embed = new EmbedBuilder()
      .setTitle("User Kicked")
      .setDescription(`${targetUser.tag} has been kicked from the server.`)
      .setColor(botInfo.colors.warning)
      .addFields({ name: "Reason", value: reason })
      .setFooter({ text: `Kicked by ${message.author.tag}` })
      .setTimestamp()

    await message.reply({ embeds: [embed] })
  } catch (error) {
    console.error("Error kicking user:", error)
    await message.reply("There was an error trying to kick this user.")
  }
}
