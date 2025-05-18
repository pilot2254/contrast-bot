import { SlashCommandBuilder, type ChatInputCommandInteraction, type Message } from "discord.js"

// Slash command definition
export const data = new SlashCommandBuilder().setName("uptime").setDescription("Shows how long the bot has been online")

// Slash command execution
export async function execute(interaction: ChatInputCommandInteraction) {
  const uptime = formatUptime(interaction.client.uptime || 0)
  await interaction.reply(`Bot has been online for: **${uptime}**`)
}

// Prefix command definition
export const name = "uptime"
export const description = "Shows how long the bot has been online"

// Prefix command execution
export async function run(message: Message, _args: string[]) {
  const uptime = formatUptime(message.client.uptime || 0)
  await message.reply(`Bot has been online for: **${uptime}**`)
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
