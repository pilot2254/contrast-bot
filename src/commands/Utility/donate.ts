import { SlashCommandBuilder, EmbedBuilder, type ChatInputCommandInteraction } from "discord.js"
import { config } from "../../utils/config"

export const data = new SlashCommandBuilder().setName("donate").setDescription("Support the bot developers")

export async function execute(interaction: ChatInputCommandInteraction) {
  const donateUrl = process.env.DONATE_URL || "https://ko-fi.com/pilot2254"

  const embed = new EmbedBuilder()
    .setColor(0x00ff00)
    .setTitle(`💖 Support ${config.botName}`)
    .setDescription(
      `Help us keep ${config.botName} running and support future development!\n\n` +
        "Your donations help us:\n" +
        "• Keep the bot online 24/7\n" +
        "• Add new features and games\n" +
        "• Fix bugs and improve performance\n" +
        "• Cover hosting and development costs\n\n" +
        "Every donation, no matter how small, is greatly appreciated! ❤️",
    )
    .addFields(
      { name: "🔗 Donation Link", value: `[Click here to donate](${donateUrl})`, inline: false },
      { name: "💝 Thank You!", value: "Your support means the world to us!", inline: false },
    )
    .setFooter({ text: `${config.botName} • Made with ❤️` })
    .setTimestamp()

  await interaction.reply({ embeds: [embed], flags: 64 })
}
