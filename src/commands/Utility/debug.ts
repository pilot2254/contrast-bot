import { SlashCommandBuilder, type ChatInputCommandInteraction, EmbedBuilder } from "discord.js"
import { botInfo } from "../../utils/bot-info"
import { isDeveloper } from "../../utils/permissions"
import { logger } from "../../utils/logger"
import { config } from "../../utils/config"

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
    .setTitle(`${config.botName} Debug Information`)
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
    .setFooter({ text: `${config.botName} • Requested by ${interaction.user.tag}` })
    .setTimestamp()

  await interaction.reply({ embeds: [embed], ephemeral: true })
}
