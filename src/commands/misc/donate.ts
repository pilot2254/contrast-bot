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
    .setName("donate")
    .setDescription("Support the bot development"),
  category: "misc",
  cooldown: 3,
  async execute(
    interaction: ChatInputCommandInteraction,
    client: ExtendedClient
  ) {
    const embed = CustomEmbedBuilder.info()
      .setTitle("❤️ Support Contrast Bot")
      .setDescription(
        "Thank you for considering supporting the development of Contrast Bot! Your donations help keep the bot running and fund new features."
      )
      .setThumbnail(client.user?.displayAvatarURL() || "")

    // Add donation links
    const donationLinks: string[] = []

    if (config.donations.kofi) {
      donationLinks.push(`[Ko-fi](${config.donations.kofi})`)
    }

    if (config.donations.paypal) {
      donationLinks.push(`[PayPal](${config.donations.paypal})`)
    }

    if (config.donations.patreon) {
      donationLinks.push(`[Patreon](${config.donations.patreon})`)
    }

    if (donationLinks.length > 0) {
      embed.addFields({
        name: "🔗 Donation Links",
        value: donationLinks.join(" • "),
        inline: false,
      })
    }

    embed.setFooter({
      text: "Every donation, no matter how small, is greatly appreciated! 💖",
    })

    await interaction.reply({ embeds: [embed] })
  },
}

export default command
