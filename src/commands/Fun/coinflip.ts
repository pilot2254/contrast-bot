import { SlashCommandBuilder, type ChatInputCommandInteraction, EmbedBuilder } from "discord.js"
import { botInfo } from "../../utils/bot-info"

// Slash command definition
export const data = new SlashCommandBuilder().setName("coinflip").setDescription("Flips a coin")

// Slash command execution
export async function execute(interaction: ChatInputCommandInteraction) {
  const result = Math.random() < 0.5 ? "Heads" : "Tails"
  const emoji = result === "Heads" ? "🪙" : "💿"

  const embed = new EmbedBuilder()
    .setTitle(`${emoji} Coin Flip`)
    .setDescription(`The coin landed on **${result}**!`)
    .setColor(botInfo.colors.primary)
    .setFooter({ text: `Flipped by ${interaction.user.tag}` })
    .setTimestamp()

  await interaction.reply({ embeds: [embed] })
}
