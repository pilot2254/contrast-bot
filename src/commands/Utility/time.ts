import { SlashCommandBuilder, type ChatInputCommandInteraction, EmbedBuilder } from "discord.js"
import { botInfo } from "../../utils/bot-info"
import { config } from "../../utils/config"

// Slash command definition
export const data = new SlashCommandBuilder()
  .setName("time")
  .setDescription("Shows the current time in different timezones")
  .addStringOption((option) =>
    option
      .setName("timezone")
      .setDescription("Timezone to display (e.g., UTC, EST, PST)")
      .setRequired(false)
      .addChoices(
        { name: "UTC", value: "UTC" },
        { name: "EST (Eastern)", value: "America/New_York" },
        { name: "CST (Central)", value: "America/Chicago" },
        { name: "MST (Mountain)", value: "America/Denver" },
        { name: "PST (Pacific)", value: "America/Los_Angeles" },
        { name: "GMT (London)", value: "Europe/London" },
        { name: "CET (Central Europe)", value: "Europe/Paris" },
        { name: "JST (Japan)", value: "Asia/Tokyo" },
        { name: "AEST (Australia)", value: "Australia/Sydney" },
      ),
  )

// Slash command execution
export async function execute(interaction: ChatInputCommandInteraction) {
  const timezone = interaction.options.getString("timezone") || "UTC"

  try {
    const now = new Date()
    const timeString = now.toLocaleString("en-US", {
      timeZone: timezone,
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      timeZoneName: "short",
    })

    const embed = new EmbedBuilder()
      .setTitle("🕐 Current Time")
      .setDescription(`**${timeString}**`)
      .setColor(botInfo.colors.primary)
      .addFields({ name: "Timezone", value: timezone, inline: true })
      .setFooter({ text: config.botName })
      .setTimestamp()

    await interaction.reply({ embeds: [embed] })
  } catch (error) {
    await interaction.reply({ content: "Invalid timezone specified.", ephemeral: true })
  }
}
