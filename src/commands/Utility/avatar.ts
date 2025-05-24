import { SlashCommandBuilder, type ChatInputCommandInteraction, EmbedBuilder } from "discord.js"
import { botInfo } from "../../utils/bot-info"

// Slash command definition
export const data = new SlashCommandBuilder()
  .setName("avatar")
  .setDescription("Shows a user's avatar")
  .addUserOption((option) => option.setName("user").setDescription("The user to show the avatar of").setRequired(false))

// Slash command execution
export async function execute(interaction: ChatInputCommandInteraction) {
  const user = interaction.options.getUser("user") || interaction.user
  const embed = createAvatarEmbed(user)
  await interaction.reply({ embeds: [embed] })
}

// Helper function to create avatar embed
function createAvatarEmbed(user: any) {
  return new EmbedBuilder()
    .setTitle(`${user.username}'s Avatar`)
    .setColor(botInfo.colors.primary)
    .setImage(user.displayAvatarURL({ size: 4096 }))
    .setDescription(
      `[PNG](${user.displayAvatarURL({ size: 4096, extension: "png" })}) | [JPG](${user.displayAvatarURL({ size: 4096, extension: "jpg" })}) | [WEBP](${user.displayAvatarURL({ size: 4096, extension: "webp" })})`,
    )
    .setFooter({ text: `User ID: ${user.id}` })
    .setTimestamp()
}
