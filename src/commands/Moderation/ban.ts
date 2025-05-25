import { SlashCommandBuilder, type ChatInputCommandInteraction, PermissionFlagsBits, EmbedBuilder } from "discord.js"
import { botInfo } from "../../utils/bot-info"
import { config } from "../../utils/config"

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
      content: "❌ This command can only be used in a server.",
      ephemeral: true,
    })
  }

  // Check user permissions
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.BanMembers)) {
    return interaction.reply({
      content: "❌ You don't have permission to ban members.",
      ephemeral: true,
    })
  }

  // Check bot permissions
  if (!interaction.guild.members.me?.permissions.has(PermissionFlagsBits.BanMembers)) {
    return interaction.reply({
      content: "❌ I don't have permission to ban members.",
      ephemeral: true,
    })
  }

  const targetUser = interaction.options.getUser("user")
  if (!targetUser) {
    return interaction.reply({
      content: "❌ You need to specify a user to ban.",
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
        content: "❌ This user is already banned.",
        ephemeral: true,
      })
    } catch {
      // User is not banned, continue
    }

    // Check if the user is trying to ban themselves
    if (targetUser.id === interaction.user.id) {
      return interaction.reply({
        content: "❌ You cannot ban yourself.",
        ephemeral: true,
      })
    }

    // Check if trying to ban the bot
    if (targetUser.id === interaction.client.user?.id) {
      return interaction.reply({
        content: "❌ I cannot ban myself.",
        ephemeral: true,
      })
    }

    // Check if the user is in the server and validate hierarchy
    try {
      const targetMember = await interaction.guild.members.fetch(targetUser.id)
      const executorMember = await interaction.guild.members.fetch(interaction.user.id)

      // Check if the target is bannable
      if (!targetMember.bannable) {
        return interaction.reply({
          content: "❌ I cannot ban this user. They may have higher permissions than me.",
          ephemeral: true,
        })
      }

      // Check role hierarchy
      if (
        targetMember.roles.highest.position >= executorMember.roles.highest.position &&
        interaction.guild.ownerId !== interaction.user.id
      ) {
        return interaction.reply({
          content: "❌ You cannot ban someone with equal or higher roles.",
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
      .setTitle("✅ User Banned")
      .setDescription(`${targetUser.tag} has been banned from the server.`)
      .setColor(botInfo.colors.error)
      .addFields(
        { name: "Reason", value: reason },
        { name: "Message Deletion", value: `${days} day${days === 1 ? "" : "s"}` },
      )
      .setFooter({ text: `${config.botName} • Banned by ${interaction.user.tag}` })
      .setTimestamp()

    await interaction.reply({ embeds: [embed] })
  } catch (error) {
    console.error("Error banning user:", error)
    await interaction.reply({
      content: "❌ There was an error trying to ban this user.",
      ephemeral: true,
    })
  }
}
