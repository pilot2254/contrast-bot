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
  .setName("ban")
  .setDescription("Bans a user from the server")
  .addUserOption((option) => option.setName("user").setDescription("The user to ban").setRequired(true))
  .addStringOption((option) =>
    option.setName("reason").setDescription("The reason for banning the user").setRequired(false),
  )
  .addIntegerOption((option) =>
    option
      .setName("days")
      .setDescription("Number of days of messages to delete (0-7)")
      .setMinValue(0)
      .setMaxValue(7)
      .setRequired(false),
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)

// Slash command execution
export async function execute(interaction: ChatInputCommandInteraction) {
  if (!interaction.guild) {
    return interaction.reply({
      content: "This command can only be used in a server.",
      ephemeral: true,
    })
  }

  // Check bot permissions
  if (!interaction.guild.members.me?.permissions.has(PermissionFlagsBits.BanMembers)) {
    return interaction.reply({
      content: "I don't have permission to ban members.",
      ephemeral: true,
    })
  }

  const targetUser = interaction.options.getUser("user")
  if (!targetUser) {
    return interaction.reply({
      content: "You need to specify a user to ban.",
      ephemeral: true,
    })
  }

  const reason = interaction.options.getString("reason") || "No reason provided"
  const days = interaction.options.getInteger("days") || 0

  try {
    // Check if the user is already banned
    try {
      await interaction.guild.bans.fetch(targetUser.id)
      return interaction.reply({
        content: "This user is already banned.",
        ephemeral: true,
      })
    } catch {
      // User is not banned, continue
    }

    // Check if the user is in the server
    try {
      const targetMember = await interaction.guild.members.fetch(targetUser.id)

      // Check if the target is bannable
      if (!targetMember.bannable) {
        return interaction.reply({
          content: "I cannot ban this user. They may have higher permissions than me.",
          ephemeral: true,
        })
      }

      // Check if the user is trying to ban themselves
      if (targetUser.id === interaction.user.id) {
        return interaction.reply({
          content: "You cannot ban yourself.",
          ephemeral: true,
        })
      }
    } catch {
      // User is not in the server, can still be banned
    }

    // Ban the user
    await interaction.guild.members.ban(targetUser.id, {
      deleteMessageDays: days,
      reason: `${reason} (Banned by ${interaction.user.tag})`,
    })

    const embed = new EmbedBuilder()
      .setTitle("User Banned")
      .setDescription(`${targetUser.tag} has been banned from the server.`)
      .setColor(botInfo.colors.error)
      .addFields(
        { name: "Reason", value: reason },
        { name: "Message Deletion", value: `${days} day${days === 1 ? "" : "s"}` },
      )
      .setFooter({ text: `Banned by ${interaction.user.tag}` })
      .setTimestamp()

    await interaction.reply({ embeds: [embed] })
  } catch (error) {
    console.error("Error banning user:", error)
    await interaction.reply({
      content: "There was an error trying to ban this user.",
      ephemeral: true,
    })
  }
}

// Prefix command definition
export const name = "ban"
export const description = "Bans a user from the server"
export const usage = "<user> [reason] [days]"

// Prefix command execution
export async function run(message: Message, args: string[]) {
  if (!message.guild) {
    return message.reply("This command can only be used in a server.")
  }

  // Check user permissions
  if (!message.member?.permissions.has(PermissionFlagsBits.BanMembers)) {
    return message.reply("You don't have permission to ban members.")
  }

  // Check bot permissions
  if (!message.guild.members.me?.permissions.has(PermissionFlagsBits.BanMembers)) {
    return message.reply("I don't have permission to ban members.")
  }

  if (!args[0]) {
    return message.reply("You need to specify a user to ban.")
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

  // Parse arguments
  let reason = "No reason provided"
  let days = 0

  if (args.length > 1) {
    // Check if the last argument is a number (days)
    const lastArg = args[args.length - 1]
    if (/^\d+$/.test(lastArg) && Number.parseInt(lastArg) >= 0 && Number.parseInt(lastArg) <= 7) {
      days = Number.parseInt(lastArg)
      reason = args.slice(1, args.length - 1).join(" ") || reason
    } else {
      reason = args.slice(1).join(" ")
    }
  }

  try {
    // Check if the user is already banned
    try {
      await message.guild.bans.fetch(targetUser.id)
      return message.reply("This user is already banned.")
    } catch {
      // User is not banned, continue
    }

    // Check if the user is in the server
    try {
      const targetMember = await message.guild.members.fetch(targetUser.id)

      // Check if the target is bannable
      if (!targetMember.bannable) {
        return message.reply("I cannot ban this user. They may have higher permissions than me.")
      }

      // Check if the user is trying to ban themselves
      if (targetUser.id === message.author.id) {
        return message.reply("You cannot ban yourself.")
      }
    } catch {
      // User is not in the server, can still be banned
    }

    // Ban the user
    await message.guild.members.ban(targetUser.id, {
      deleteMessageDays: days,
      reason: `${reason} (Banned by ${message.author.tag})`,
    })

    const embed = new EmbedBuilder()
      .setTitle("User Banned")
      .setDescription(`${targetUser.tag} has been banned from the server.`)
      .setColor(botInfo.colors.error)
      .addFields(
        { name: "Reason", value: reason },
        { name: "Message Deletion", value: `${days} day${days === 1 ? "" : "s"}` },
      )
      .setFooter({ text: `Banned by ${message.author.tag}` })
      .setTimestamp()

    await message.reply({ embeds: [embed] })
  } catch (error) {
    console.error("Error banning user:", error)
    await message.reply("There was an error trying to ban this user.")
  }
}
