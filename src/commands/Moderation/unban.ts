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
  .setName("unban")
  .setDescription("Unbans a user from the server")
  .addStringOption((option) => option.setName("userid").setDescription("The ID of the user to unban").setRequired(true))
  .addStringOption((option) =>
    option.setName("reason").setDescription("The reason for unbanning the user").setRequired(false),
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
      content: "I don't have permission to unban members.",
      ephemeral: true,
    })
  }

  const userId = interaction.options.getString("userid")
  if (!userId) {
    return interaction.reply({
      content: "You need to specify a user ID to unban.",
      ephemeral: true,
    })
  }

  const reason = interaction.options.getString("reason") || "No reason provided"

  try {
    // Check if the user is banned
    let bannedUser
    try {
      bannedUser = await interaction.guild.bans.fetch(userId)
    } catch {
      return interaction.reply({
        content: "This user is not banned or the ID is invalid.",
        ephemeral: true,
      })
    }

    // Unban the user
    await interaction.guild.members.unban(userId, `${reason} (Unbanned by ${interaction.user.tag})`)

    const embed = new EmbedBuilder()
      .setTitle("User Unbanned")
      .setDescription(`${bannedUser.user.tag || userId} has been unbanned from the server.`)
      .setColor(botInfo.colors.success)
      .addFields({ name: "Reason", value: reason })
      .setFooter({ text: `Unbanned by ${interaction.user.tag}` })
      .setTimestamp()

    await interaction.reply({ embeds: [embed] })
  } catch (error) {
    console.error("Error unbanning user:", error)
    await interaction.reply({
      content: "There was an error trying to unban this user.",
      ephemeral: true,
    })
  }
}

// Prefix command definition
export const name = "unban"
export const description = "Unbans a user from the server"
export const usage = "<userId> [reason]"

// Prefix command execution
export async function run(message: Message, args: string[]) {
  if (!message.guild) {
    return message.reply("This command can only be used in a server.")
  }

  // Check user permissions
  if (!message.member?.permissions.has(PermissionFlagsBits.BanMembers)) {
    return message.reply("You don't have permission to unban members.")
  }

  // Check bot permissions
  if (!message.guild.members.me?.permissions.has(PermissionFlagsBits.BanMembers)) {
    return message.reply("I don't have permission to unban members.")
  }

  if (!args[0]) {
    return message.reply("You need to specify a user ID to unban.")
  }

  const userId = args[0]
  const reason = args.slice(1).join(" ") || "No reason provided"

  try {
    // Check if the user is banned
    let bannedUser
    try {
      bannedUser = await message.guild.bans.fetch(userId)
    } catch {
      return message.reply("This user is not banned or the ID is invalid.")
    }

    // Unban the user
    await message.guild.members.unban(userId, `${reason} (Unbanned by ${message.author.tag})`)

    const embed = new EmbedBuilder()
      .setTitle("User Unbanned")
      .setDescription(`${bannedUser.user.tag || userId} has been unbanned from the server.`)
      .setColor(botInfo.colors.success)
      .addFields({ name: "Reason", value: reason })
      .setFooter({ text: `Unbanned by ${message.author.tag}` })
      .setTimestamp()

    await message.reply({ embeds: [embed] })
  } catch (error) {
    console.error("Error unbanning user:", error)
    await message.reply("There was an error trying to unban this user.")
  }
}
