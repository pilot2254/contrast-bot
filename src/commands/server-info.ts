import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type Message,
  EmbedBuilder,
  ChannelType,
} from "discord.js"
import { botInfo } from "../utils/bot-info"

export const data = new SlashCommandBuilder()
  .setName("server-info")
  .setDescription("Displays information about the current server")

export async function execute(interaction: ChatInputCommandInteraction) {
  if (!interaction.guild) {
    return interaction.reply({
      content: "This command can only be used in a server, not in DMs or group chats.",
      ephemeral: true,
    })
  }

  const guild = interaction.guild
  await guild.fetch()

  const textChannels = guild.channels.cache.filter((c) => c.type === ChannelType.GuildText).size
  const voiceChannels = guild.channels.cache.filter((c) => c.type === ChannelType.GuildVoice).size
  const categoryChannels = guild.channels.cache.filter((c) => c.type === ChannelType.GuildCategory).size

  const embed = new EmbedBuilder()
    .setTitle(`${guild.name} Server Information`)
    .setColor(botInfo.colors.primary)
    .setThumbnail(guild.iconURL({ size: 1024 }) || "")
    .addFields(
      { name: "Server ID", value: guild.id, inline: true },
      { name: "Created On", value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:F>`, inline: true },
      { name: "Owner", value: `<@${guild.ownerId}>`, inline: true },
      {
        name: "Members",
        value: `Total: ${guild.memberCount}`,
        inline: true,
      },
      {
        name: "Channels",
        value: `Text: ${textChannels} | Voice: ${voiceChannels} | Categories: ${categoryChannels}`,
        inline: true,
      },
      {
        name: "Other",
        value: `Roles: ${guild.roles.cache.size} | Emojis: ${guild.emojis.cache.size}`,
        inline: true,
      },
    )
    .setFooter({ text: `Requested by ${interaction.user.tag}` })
    .setTimestamp()

  if (guild.banner) {
    embed.setImage(guild.bannerURL({ size: 1024 }) || "")
  }

  await interaction.reply({ embeds: [embed] })
}

export const name = "server-info"
export const aliases = ["serverinfo", "server"]
export const description = "Displays information about the current server"
export const category = "Utility"

export async function run(message: Message, args: string[]) {
  if (!message.guild) {
    return message.reply("This command can only be used in a server, not in DMs or group chats.")
  }

  const guild = message.guild
  await guild.fetch()

  const textChannels = guild.channels.cache.filter((c) => c.type === ChannelType.GuildText).size
  const voiceChannels = guild.channels.cache.filter((c) => c.type === ChannelType.GuildVoice).size
  const categoryChannels = guild.channels.cache.filter((c) => c.type === ChannelType.GuildCategory).size

  const embed = new EmbedBuilder()
    .setTitle(`${guild.name} Server Information`)
    .setColor(botInfo.colors.primary)
    .setThumbnail(guild.iconURL({ size: 1024 }) || "")
    .addFields(
      { name: "Server ID", value: guild.id, inline: true },
      { name: "Created On", value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:F>`, inline: true },
      { name: "Owner", value: `<@${guild.ownerId}>`, inline: true },
      {
        name: "Members",
        value: `Total: ${guild.memberCount}`,
        inline: true,
      },
      {
        name: "Channels",
        value: `Text: ${textChannels} | Voice: ${voiceChannels} | Categories: ${categoryChannels}`,
        inline: true,
      },
      {
        name: "Other",
        value: `Roles: ${guild.roles.cache.size} | Emojis: ${guild.emojis.cache.size}`,
        inline: true,
      },
    )
    .setFooter({ text: `Requested by ${message.author.tag}` })
    .setTimestamp()

  if (guild.banner) {
    embed.setImage(guild.bannerURL({ size: 1024 }) || "")
  }

  await message.reply({ embeds: [embed] })
}