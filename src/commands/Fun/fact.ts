import { SlashCommandBuilder, type ChatInputCommandInteraction, EmbedBuilder } from "discord.js"
import { botInfo } from "../../utils/bot-info"
import { facts } from "../../constants/facts"

// Slash command definition
export const data = new SlashCommandBuilder().setName("fact").setDescription("Shares a random interesting fact")

// Slash command execution
export async function execute(interaction: ChatInputCommandInteraction) {
  const randomFact = facts[Math.floor(Math.random() * facts.length)]

  const embed = new EmbedBuilder()
    .setTitle("Did you know?")
    .setDescription(randomFact)
    .setColor(botInfo.colors.primary)
    .setFooter({ text: `Requested by ${interaction.user.tag}` })
    .setTimestamp()

  await interaction.reply({ embeds: [embed] })
}
