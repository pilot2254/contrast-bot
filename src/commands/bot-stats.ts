import { SlashCommandBuilder, type ChatInputCommandInteraction, type Message, EmbedBuilder } from "discord.js"
import { botInfo } from "../utils/bot-info"
import { getStats } from "../utils/stats-manager"
import { config } from "../utils/config"

// Slash command definition
export const data = new SlashCommandBuilder().setName("bot-stats").setDescription("Shows statistics about the bot")

// Slash command execution
export async function execute(interaction: ChatInputCommandInteraction) {
  const stats = getStats()
  const embed = createStatsEmbed(stats, interaction.client.guilds.cache.size)
  await interaction.reply({ embeds: [embed] })
}

// Prefix command definition
export const name = "bot-stats"
export const aliases = ["stats", "botstats"]
export const description = "Shows statistics about the bot"
export const category = "Utility"

// Prefix command execution
export async function run(message: Message, args: string[]) {
  const stats = getStats()
  const embed = createStatsEmbed(stats, message.client.guilds.cache.size)
  await message.reply({ embeds: [embed] })
}

// Helper function to create the stats embed
function createStatsEmbed(stats: any, currentGuildCount: number) {
  // Get top 5 commands
  const topCommands =
    Object.entries(stats.commandsUsed)
      .sort(([, a]: any, [, b]: any) => b - a)
      .slice(0, 5)
      .map(([cmd, count]: any) => `${cmd}: ${count} uses`)
      .join("\n") || "No commands used yet"

  // Calculate uptime
  const uptime = Date.now() - stats.startTime
  const uptimeFormatted = formatUptime(uptime)

  return new EmbedBuilder()
    .setTitle(`${config.botName} Statistics`)
    .setColor(botInfo.colors.primary)
    .addFields(
      { name: "Total Commands Used", value: stats.totalCommands.toString(), inline: true },
      { name: "Server Count", value: currentGuildCount.toString(), inline: true },
      { name: "Uptime", value: uptimeFormatted, inline: true },
      { name: "Top Commands", value: topCommands },
    )
    .setFooter({ text: config.botName })
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

  return parts.join(", ") || "0 seconds"
}