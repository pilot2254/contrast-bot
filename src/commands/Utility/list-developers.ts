import { SlashCommandBuilder, type ChatInputCommandInteraction, EmbedBuilder } from "discord.js"
import { botInfo } from "../../utils/bot-info"
import { config } from "../../utils/config"
import { DEVELOPER_IDS } from "../../utils/permissions"
import { logger } from "../../utils/logger"

// Slash command definition
export const data = new SlashCommandBuilder()
  .setName("list-developers")
  .setDescription("Lists all bot developers and their IDs")

// Slash command execution
export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: false })

  try {
    // Create embed for developer list
    const embed = new EmbedBuilder()
      .setTitle(`${config.botName} Developers`)
      .setDescription("List of all developers who have special permissions")
      .setColor(botInfo.colors.primary)
      .setFooter({ text: `Requested by ${interaction.user.tag}` })
      .setTimestamp()

    // Fetch user data for each developer ID
    const developerPromises = DEVELOPER_IDS.map((id: string) =>
      interaction.client.users
        .fetch(id)
        .then((user) => ({ id, tag: user.tag, username: user.username, found: true }))
        .catch(() => ({ id, tag: "Unknown User", username: "Unknown", found: false })),
    )

    const developers = await Promise.all(developerPromises)

    // Add fields for each developer
    developers.forEach((dev: any) => {
      embed.addFields({
        name: dev.found ? dev.username : `Unknown User (${dev.id})`,
        value: `ID: ${dev.id}${dev.found ? `\nTag: ${dev.tag}` : "\nCould not fetch user data"}`,
        inline: true,
      })
    })

    // Add note about hardcoded developer
    embed.addFields({
      name: "Note",
      value: "User ID 171395713064894465 is also hardcoded as a developer for fallback purposes.",
      inline: false,
    })

    await interaction.editReply({ embeds: [embed] })
    logger.info(`Developer list viewed by ${interaction.user.tag}`)
  } catch (error) {
    logger.error("Error displaying developer list:", error)
    await interaction.editReply("An error occurred while fetching the developer list.")
  }
}
