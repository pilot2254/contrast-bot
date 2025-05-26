import { SlashCommandBuilder, type ChatInputCommandInteraction, EmbedBuilder } from "discord.js"
import { botInfo } from "../../utils/bot-info"
import { jokes } from "../../constants/jokes"
import { config } from "../../utils/config"

// Slash command definition
export const data = new SlashCommandBuilder().setName("joke").setDescription("Tells a random joke")

// Slash command execution
export async function execute(interaction: ChatInputCommandInteraction) {
  const randomJoke = jokes[Math.floor(Math.random() * jokes.length)]

  const embed = new EmbedBuilder()
    .setTitle("Here's a joke for you")
    .setDescription(randomJoke)
    .setColor(botInfo.colors.primary)
    .setFooter({ text: `${config.botName} • Requested by ${interaction.user.tag}` })
    .setTimestamp()

  await interaction.reply({ embeds: [embed] })
}
