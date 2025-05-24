import { SlashCommandBuilder, type ChatInputCommandInteraction, PermissionFlagsBits, EmbedBuilder } from "discord.js"
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
