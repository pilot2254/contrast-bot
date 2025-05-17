import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type Message,
  EmbedBuilder,
  type Role,
} from "discord.js"
import { botInfo } from "../utils/bot-info"

export const data = new SlashCommandBuilder()
  .setName("user-info")
  .setDescription("Displays information about a user")
  .addUserOption((option) =>
    option.setName("user").setDescription("The user to display information about").setRequired(false),
  )

export async function execute(interaction: ChatInputCommandInteraction) {
  const targetUser = interaction.options.getUser("user") || interaction.user
  const targetMember = interaction.guild?.members.cache.get(targetUser.id)

  const embed = createUserEmbed(targetUser, targetMember)
  embed.setFooter({ text: `Requested by ${interaction.user.tag}` }).setTimestamp()

  await interaction.reply({ embeds: [embed] })
}

export const name = "user-info"
export const aliases = ["userinfo", "user", "whois"]
export const description = "Displays information about a user"
export const category = "Utility"
export const usage = "[user]"

export async function run(message: Message, args: string[]) {
  let targetUser = message.author
  let targetMember = message.guild?.members.cache.get(message.author.id)

  if (args.length > 0) {
    const userMention = message.mentions.users.first()
    if (userMention) {
      targetUser = userMention
      targetMember = message.guild?.members.cache.get(userMention.id)
    } else {
      try {
        const user = await message.client.users.fetch(args[0])
        targetUser = user
        if (message.guild) {
          try {
            targetMember = await message.guild.members.fetch(user.id)
          } catch {
            targetMember = undefined
          }
        }
      } catch {
        if (message.guild) {
          const foundMember = message.guild.members.cache.find(
            (member) =>
              member.user.username.toLowerCase() === args.join(" ").toLowerCase() ||
              (member.nickname && member.nickname.toLowerCase() === args.join(" ").toLowerCase()),
          )
          if (foundMember) {
            targetUser = foundMember.user
            targetMember = foundMember
          } else {
            return message.reply(`Could not find user "${args.join(" ")}".`)
          }
        } else {
          return message.reply(`Could not find user "${args.join(" ")}".`)
        }
      }
    }
  }

  const embed = createUserEmbed(targetUser, targetMember)
  embed.setFooter({ text: `Requested by ${message.author.tag}` }).setTimestamp()

  await message.reply({ embeds: [embed] })
}

function createUserEmbed(user: any, member?: any) {
  const embed = new EmbedBuilder()
    .setTitle(`${user.username}${user.discriminator !== "0" ? `#${user.discriminator}` : ""}`)
    .setColor(member?.displayColor || botInfo.colors.primary)
    .setThumbnail(user.displayAvatarURL({ size: 1024 }))
    .addFields(
      { name: "User ID", value: user.id, inline: true },
      { name: "Created On", value: `<t:${Math.floor(user.createdTimestamp / 1000)}:F>`, inline: true },
    )

  if (member) {
    embed.addFields({
      name: "Joined Server",
      value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>`,
      inline: true,
    })

    if (member.nickname) {
      embed.addFields({ name: "Nickname", value: member.nickname, inline: true })
    }

    const roles = member.roles.cache
      .filter((role: Role) => role.id !== member.guild.id)
      .sort((a: Role, b: Role) => b.position - a.position)
      .map((role: Role) => `<@&${role.id}>`)
      .join(", ")

    if (roles) {
      embed.addFields({ name: `Roles [${member.roles.cache.size - 1}]`, value: roles || "None" })
    }
  }

  if (user.bot) {
    embed.addFields({ name: "Bot", value: "Yes", inline: true })
  }

  return embed
}