import { SlashCommandBuilder, type ChatInputCommandInteraction, EmbedBuilder } from "discord.js"
import { botInfo } from "../../utils/bot-info"
import { config } from "../../utils/config"

// Slash command definition
export const data = new SlashCommandBuilder().setName("info").setDescription("Shows information about the bot")

// Slash command execution
export async function execute(interaction: ChatInputCommandInteraction) {
  const embed = new EmbedBuilder()
    .setTitle(config.botName)
    .setDescription(botInfo.description)
    .setColor(botInfo.colors.primary)
    .setThumbnail(interaction.client.user?.displayAvatarURL({ size: 256 }))
    .addFields(
      { name: "Version", value: botInfo.version, inline: true },
      { name: "Library", value: `Discord.js ${botInfo.technical.discordJs}`, inline: true },
      { name: "Node.js", value: botInfo.technical.node, inline: true },
      { name: "Servers", value: interaction.client.guilds.cache.size.toString(), inline: true },
      { name: "Uptime", value: formatUptime(interaction.client.uptime || 0), inline: true },
    )
    .addFields({
      name: "Links",
      value: `[GitHub](${botInfo.links.github}) • [Support](${botInfo.links.supportServer}) • [Invite](${botInfo.links.inviteMe})`,
    })
    .setFooter({ text: `Requested by ${interaction.user.tag}` })
    .setTimestamp()

  await interaction.reply({ embeds: [embed] })
}

// Helper function to format uptime
function formatUptime(uptime: number): string {
  const seconds = Math.floor(uptime / 1000) % 60
  const minutes = Math.floor(uptime / (1000 * 60)) % 60
  const hours = Math.floor(uptime / (1000 * 60 * 60)) % 24
  const days = Math.floor(uptime / (1000 * 60 * 60 * 24))

  const parts = []
  if (days > 0) parts.push(`${days}d`)
  if (hours > 0) parts.push(`${hours}h`)
  if (minutes > 0) parts.push(`${minutes}m`)
  if (seconds > 0) parts.push(`${seconds}s`)

  return parts.join(" ") || "0s"
}
