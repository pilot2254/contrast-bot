import { SlashCommandBuilder, type ChatInputCommandInteraction, EmbedBuilder, type Role } from "discord.js"
import { botInfo } from "../../utils/bot-info"

// Slash command definition
export const data = new SlashCommandBuilder()
  .setName("whois")
  .setDescription("Displays detailed information about a user")
  .addUserOption((option) =>
    option.setName("user").setDescription("The user to display information about").setRequired(false),
  )

// Slash command execution
export async function execute(interaction: ChatInputCommandInteraction) {
  const targetUser = interaction.options.getUser("user") || interaction.user
  const targetMember = interaction.guild?.members.cache.get(targetUser.id)

  const embed = createUserEmbed(targetUser, targetMember)
  embed.setFooter({ text: `Requested by ${interaction.user.tag}` }).setTimestamp()

  await interaction.reply({ embeds: [embed] })
}

// Helper function to create user embed
function createUserEmbed(user: any, member?: any) {
  const embed = new EmbedBuilder()
    .setTitle(`${user.username}${user.discriminator !== "0" ? `#${user.discriminator}` : ""}`)
    .setColor(member?.displayColor || botInfo.colors.primary)
    .setThumbnail(user.displayAvatarURL({ size: 1024 }))
    .addFields(
      { name: "User ID", value: user.id, inline: true },
      { name: "Created", value: `<t:${Math.floor(user.createdTimestamp / 1000)}:F>`, inline: true },
      { name: "Created", value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true },
    )

  if (member) {
    embed.addFields(
      { name: "Joined", value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>`, inline: true },
      { name: "Joined", value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`, inline: true },
    )

    if (member.nickname) {
      embed.addFields({ name: "Nickname", value: member.nickname, inline: true })
    }

    // Get key permissions
    const keyPermissions = getKeyPermissions(member)
    if (keyPermissions.length > 0) {
      embed.addFields({ name: "Key Permissions", value: keyPermissions.join(", "), inline: false })
    }

    // Get top roles (up to 10)
    const roles = member.roles.cache
      .filter((role: Role) => role.id !== member.guild.id)
      .sort((a: Role, b: Role) => b.position - a.position)
      .map((role: Role) => `<@&${role.id}>`)
      .slice(0, 10)
      .join(", ")

    if (roles) {
      embed.addFields({
        name: `Roles [${member.roles.cache.size - 1}]`,
        value: roles || "None",
        inline: false,
      })
    }

    // Add acknowledgements
    const acknowledgements = getAcknowledgements(member)
    if (acknowledgements.length > 0) {
      embed.addFields({ name: "Acknowledgements", value: acknowledgements.join(", "), inline: false })
    }
  }

  if (user.bot) {
    embed.addFields({ name: "Bot", value: "Yes", inline: true })
  }

  return embed
}

// Helper function to get key permissions
function getKeyPermissions(member: any): string[] {
  if (!member || !member.permissions) return []

  const keyPermissions = []

  if (member.permissions.has("Administrator")) return ["Administrator"]

  if (member.permissions.has("ManageGuild")) keyPermissions.push("Manage Server")
  if (member.permissions.has("ManageRoles")) keyPermissions.push("Manage Roles")
  if (member.permissions.has("ManageChannels")) keyPermissions.push("Manage Channels")
  if (member.permissions.has("ManageMessages")) keyPermissions.push("Manage Messages")
  if (member.permissions.has("KickMembers")) keyPermissions.push("Kick Members")
  if (member.permissions.has("BanMembers")) keyPermissions.push("Ban Members")
  if (member.permissions.has("MentionEveryone")) keyPermissions.push("Mention Everyone")

  return keyPermissions
}

// Helper function to get acknowledgements
function getAcknowledgements(member: any): string[] {
  if (!member || !member.guild) return []

  const acknowledgements = []

  if (member.id === member.guild.ownerId) {
    acknowledgements.push("Server Owner")
    return acknowledgements
  }

  if (member.permissions.has("Administrator")) acknowledgements.push("Administrator")
  else if (member.permissions.has("ManageGuild")) acknowledgements.push("Server Manager")
  else if (member.permissions.has("ModerateMembers")) acknowledgements.push("Moderator")

  return acknowledgements
}
