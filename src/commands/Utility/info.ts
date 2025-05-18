import { SlashCommandBuilder, type ChatInputCommandInteraction, type Message, EmbedBuilder } from "discord.js"
import { botInfo } from "../../utils/bot-info"
import { config } from "../../utils/config"

// Slash command definition
export const data = new SlashCommandBuilder().setName("info").setDescription("Shows information about the bot")

// Slash command execution
export async function execute(interaction: ChatInputCommandInteraction) {
  const embed = createInfoEmbed(interaction.client.uptime || 0)
  await interaction.reply({ embeds: [embed] })
}

// Prefix command definition
export const name = "info"
export const aliases = ["about", "botinfo"]
export const description = "Shows information about the bot"

// Prefix command execution
export async function run(message: Message, args: string[]) {
  const embed = createInfoEmbed(message.client.uptime || 0)
  await message.reply({ embeds: [embed] })
}

// Helper function to create the info embed
function createInfoEmbed(uptime: number) {
  const uptimeFormatted = formatUptime(uptime)

  return new EmbedBuilder()
    .setTitle(`${botInfo.name} Bot Information`)
    .setDescription(botInfo.description)
    .setColor(botInfo.colors.primary)
    .addFields(
      { name: "Version", value: botInfo.version, inline: true },
      { name: "Prefix", value: config.prefix, inline: true },
      { name: "Uptime", value: uptimeFormatted, inline: true },
      { name: "Discord.js", value: botInfo.technical.discordJs, inline: true },
      { name: "Node.js", value: botInfo.technical.node, inline: true },
      { name: "Links", value: `[GitHub](${botInfo.links.github}) | [Support](${botInfo.links.support})` },
    )
    .setFooter({ text: `${botInfo.name} • Made with ❤️` })
    .setTimestamp()
}

// Helper function to format uptime
function formatUptime(uptime: number): string {
  const seconds = Math.floor(uptime / 1000) % 60
  const minutes = Math.floor(uptime / (1000 * 60)) % 60
  const hours = Math.floor(uptime / (1000 * 60 * 60)) % 24
  const days = Math.floor(uptime / (1000 * 60 * 60 * 24))

  const parts = []

  if (days > 0) parts.push(`${days} day${days === 1 ? "" : "s"}`)
  if (hours > 0) parts.push(`${hours} hour${hours === 1 ? "" : "s"}`)
  if (minutes > 0) parts.push(`${minutes} minute${minutes === 1 ? "" : "s"}`)
  if (seconds > 0) parts.push(`${seconds} second${seconds === 1 ? "" : "s"}`)

  return parts.join(", ")
}
