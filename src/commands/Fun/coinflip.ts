import { SlashCommandBuilder, type ChatInputCommandInteraction, type Message, EmbedBuilder } from "discord.js"
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

// Prefix command definition
export const name = "coinflip"
export const aliases = ["flip", "coin"]
export const description = "Flips a coin"

// Prefix command execution
export async function run(message: Message, args: string[]) {
  const result = Math.random() < 0.5 ? "Heads" : "Tails"
  const emoji = result === "Heads" ? "🪙" : "💿"

  const embed = new EmbedBuilder()
    .setTitle(`${emoji} Coin Flip`)
    .setDescription(`The coin landed on **${result}**!`)
    .setColor(botInfo.colors.primary)
    .setFooter({ text: `Flipped by ${message.author.tag}` })
    .setTimestamp()

  await message.reply({ embeds: [embed] })
}
