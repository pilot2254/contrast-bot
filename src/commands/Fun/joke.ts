import { SlashCommandBuilder, type ChatInputCommandInteraction, type Message, EmbedBuilder } from "discord.js"
import { botInfo } from "../../utils/bot-info"
import { jokes } from "../../constants/jokes"

// Slash command definition
export const data = new SlashCommandBuilder().setName("joke").setDescription("Tells a random joke")

// Slash command execution
export async function execute(interaction: ChatInputCommandInteraction) {
  const randomJoke = jokes[Math.floor(Math.random() * jokes.length)]

  const embed = new EmbedBuilder()
    .setTitle("Here's a joke for you")
    .setDescription(randomJoke)
    .setColor(botInfo.colors.primary)
    .setFooter({ text: `Requested by ${interaction.user.tag}` })
    .setTimestamp()

  await interaction.reply({ embeds: [embed] })
}

// Prefix command definition
export const name = "joke"
export const aliases = ["jokes", "funny"]
export const description = "Tells a random joke"

// Prefix command execution
export async function run(message: Message, args: string[]) {
  const randomJoke = jokes[Math.floor(Math.random() * jokes.length)]

  const embed = new EmbedBuilder()
    .setTitle("Here's a joke for you")
    .setDescription(randomJoke)
    .setColor(botInfo.colors.primary)
    .setFooter({ text: `Requested by ${message.author.tag}` })
    .setTimestamp()

  await message.reply({ embeds: [embed] })
}