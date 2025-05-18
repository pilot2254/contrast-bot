import { SlashCommandBuilder, type ChatInputCommandInteraction, type Message, EmbedBuilder } from "discord.js"
import { botInfo } from "../../utils/bot-info"
import { isDeveloper } from "../../utils/permissions"
import { logger } from "../../utils/logger"

// Slash command definition
export const data = new SlashCommandBuilder()
  .setName("debug")
  .setDescription("Shows debug information about the bot and user")

// Slash command execution
export async function execute(interaction: ChatInputCommandInteraction) {
  const userId = String(interaction.user.id).trim()
  logger.info(`Debug command executed by user ID: "${userId}"`)

  // Check developer status
  const isDev = isDeveloper(interaction.user)
  const directCheck = userId === "171395713064894465"

  const embed = new EmbedBuilder()
    .setTitle("Debug Information")
    .setColor(botInfo.colors.primary)
    .addFields(
      { name: "User ID", value: `"${userId}" (${typeof userId})`, inline: true },
      { name: "Is Developer (Function)", value: isDev ? "Yes" : "No", inline: true },
      { name: "Is Developer (Direct)", value: directCheck ? "Yes" : "No", inline: true },
      { name: "Username", value: interaction.user.username, inline: true },
      { name: "Bot Version", value: botInfo.version, inline: true },
      { name: "Node.js", value: botInfo.technical.node, inline: true },
      { name: "Discord.js", value: botInfo.technical.discordJs, inline: true },
    )
    .setFooter({ text: `Requested by ${interaction.user.tag}` })
    .setTimestamp()

  await interaction.reply({ embeds: [embed], ephemeral: true })
}

// Prefix command definition
export const name = "debug"
export const aliases = ["diag", "diagnostics"]
export const description = "Shows debug information about the bot and user"

// Prefix command execution
export async function run(message: Message, args: string[]) {
  const userId = String(message.author.id).trim()
  logger.info(`Debug command executed by user ID: "${userId}"`)

  // Check developer status
  const isDev = isDeveloper(message.author)
  const directCheck = userId === "171395713064894465"

  const embed = new EmbedBuilder()
    .setTitle("Debug Information")
    .setColor(botInfo.colors.primary)
    .addFields(
      { name: "User ID", value: `"${userId}" (${typeof userId})`, inline: true },
      { name: "Is Developer (Function)", value: isDev ? "Yes" : "No", inline: true },
      { name: "Is Developer (Direct)", value: directCheck ? "Yes" : "No", inline: true },
      { name: "Username", value: message.author.username, inline: true },
      { name: "Bot Version", value: botInfo.version, inline: true },
      { name: "Node.js", value: botInfo.technical.node, inline: true },
      { name: "Discord.js", value: botInfo.technical.discordJs, inline: true },
    )
    .setFooter({ text: `Requested by ${message.author.tag}` })
    .setTimestamp()

  await message.reply({ embeds: [embed] })
}
