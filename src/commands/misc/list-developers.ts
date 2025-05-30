import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js"
import { CustomEmbedBuilder } from "../../utils/EmbedBuilder"
import { config } from "../../config/bot.config"
import type { ExtendedClient } from "../../structures/ExtendedClient"
import type { Command } from "../../types/Command"

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("list-developers")
    .setDescription("View the bot developers"),
  category: "misc",
  cooldown: 3,
  async execute(
    interaction: ChatInputCommandInteraction,
    client: ExtendedClient
  ) {
    const embed = CustomEmbedBuilder.info()
      .setTitle("👨‍💻 Bot Developers")
      .setDescription(
        "The amazing people who develop and maintain Contrast Bot"
      )

    const developers: string[] = []

    // Fetch developer information
    for (const devId of config.bot.developers) {
      try {
        const user = await client.users.fetch(devId)
        developers.push(`• **${user.username}** (${user.id})`)
      } catch {
        developers.push(`• **Unknown Developer** (${devId})`)
      }
    }

    embed.addFields({
      name: "Developers",
      value: developers.join("\n") || "No developers configured",
      inline: false,
    })

    await interaction.reply({ embeds: [embed] })
  },
}

export default command
