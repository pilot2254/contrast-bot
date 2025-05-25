import { SlashCommandBuilder, type ChatInputCommandInteraction, EmbedBuilder } from "discord.js"
import { botInfo } from "../../utils/bot-info"
import { config } from "../../utils/config"

// Slash command definition
export const data = new SlashCommandBuilder()
  .setName("server-info")
  .setDescription("Shows information about the current server")

// Slash command execution
export async function execute(interaction: ChatInputCommandInteraction) {
  if (!interaction.guild) {
    return interaction.reply({ content: "This command can only be used in a server.", ephemeral: true })
  }

  const guild = interaction.guild
  const owner = await guild.fetchOwner()

  const embed = new EmbedBuilder()
    .setTitle(`Server Information: ${guild.name}`)
    .setColor(botInfo.colors.primary)
    .setThumbnail(guild.iconURL())
    .addFields(
      { name: "Server ID", value: guild.id, inline: true },
      { name: "Owner", value: `${owner.user.tag}`, inline: true },
      { name: "Created", value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:F>`, inline: true },
      { name: "Members", value: guild.memberCount.toString(), inline: true },
      { name: "Channels", value: guild.channels.cache.size.toString(), inline: true },
      { name: "Roles", value: guild.roles.cache.size.toString(), inline: true },
      { name: "Boost Level", value: guild.premiumTier.toString(), inline: true },
      { name: "Boosts", value: guild.premiumSubscriptionCount?.toString() || "0", inline: true },
      { name: "Verification Level", value: guild.verificationLevel.toString(), inline: true },
    )
    .setFooter({ text: config.botName })
    .setTimestamp()

  if (guild.description) {
    embed.setDescription(guild.description)
  }

  await interaction.reply({ embeds: [embed] })
}
