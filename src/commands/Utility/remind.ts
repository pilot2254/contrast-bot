import { SlashCommandBuilder, type ChatInputCommandInteraction, EmbedBuilder, type TextChannel } from "discord.js"
import { botInfo } from "../../utils/bot-info"
import { createReminder, getUserReminders, cancelReminder } from "../../utils/reminder-manager"

// Slash command definition
export const data = new SlashCommandBuilder()
  .setName("remind")
  .setDescription("Sets a reminder")
  .addSubcommand((subcommand) =>
    subcommand
      .setName("me")
      .setDescription("Sets a reminder")
      .addStringOption((option) =>
        option.setName("time").setDescription("When to remind you (e.g. 1h30m, 2d, 30s)").setRequired(true),
      )
      .addStringOption((option) =>
        option.setName("message").setDescription("What to remind you about").setRequired(true),
      ),
  )
  .addSubcommand((subcommand) => subcommand.setName("list").setDescription("Lists your active reminders"))
  .addSubcommand((subcommand) =>
    subcommand
      .setName("cancel")
      .setDescription("Cancels a reminder")
      .addIntegerOption((option) =>
        option.setName("index").setDescription("The index of the reminder to cancel").setRequired(true).setMinValue(1),
      ),
  )

// Slash command execution
export async function execute(interaction: ChatInputCommandInteraction) {
  const subcommand = interaction.options.getSubcommand()

  if (subcommand === "me") {
    const timeString = interaction.options.getString("time", true)
    const message = interaction.options.getString("message", true)

    const milliseconds = parseTimeString(timeString)
    if (milliseconds === null) {
      return interaction.reply({
        content: "Invalid time format. Use formats like 1h30m, 2d, 30s.",
        ephemeral: true,
      })
    }

    if (milliseconds < 1000) {
      return interaction.reply({
        content: "Reminder time must be at least 1 second.",
        ephemeral: true,
      })
    }

    if (milliseconds > 1000 * 60 * 60 * 24 * 7) {
      return interaction.reply({
        content: "Reminder time cannot be more than 7 days.",
        ephemeral: true,
      })
    }

    createReminder(interaction.user, interaction.channel as TextChannel, message, milliseconds)

    const embed = new EmbedBuilder()
      .setTitle("Reminder Set")
      .setDescription(`I'll remind you: ${message}`)
      .setColor(botInfo.colors.primary)
      .addFields({ name: "When", value: `<t:${Math.floor((Date.now() + milliseconds) / 1000)}:R>` })
      .setFooter({ text: `Requested by ${interaction.user.tag}` })
      .setTimestamp()

    await interaction.reply({ embeds: [embed] })
  } else if (subcommand === "list") {
    const reminders = getUserReminders(interaction.user.id)

    if (reminders.length === 0) {
      return interaction.reply({
        content: "You don't have any active reminders.",
        ephemeral: true,
      })
    }

    const embed = new EmbedBuilder()
      .setTitle("Your Reminders")
      .setColor(botInfo.colors.primary)
      .setFooter({ text: `Requested by ${interaction.user.tag}` })
      .setTimestamp()

    reminders.forEach((reminder, index) => {
      embed.addFields({
        name: `${index + 1}. <t:${Math.floor(reminder.timestamp / 1000)}:R>`,
        value: reminder.message,
      })
    })

    await interaction.reply({ embeds: [embed], ephemeral: true })
  } else if (subcommand === "cancel") {
    const index = interaction.options.getInteger("index", true)
    const reminders = getUserReminders(interaction.user.id)

    if (reminders.length === 0) {
      return interaction.reply({
        content: "You don't have any active reminders.",
        ephemeral: true,
      })
    }

    if (index > reminders.length) {
      return interaction.reply({
        content: `You only have ${reminders.length} reminder${reminders.length === 1 ? "" : "s"}.`,
        ephemeral: true,
      })
    }

    const reminder = reminders[index - 1]
    cancelReminder(reminder.id)

    await interaction.reply({
      content: `Cancelled reminder: ${reminder.message}`,
      ephemeral: true,
    })
  }
}

// Helper function to parse time strings like "1h30m", "2d", "30s"
function parseTimeString(timeString: string): number | null {
  const regex = /^(\d+)([dhms])(?:(\d+)([dhms]))?(?:(\d+)([dhms]))?(?:(\d+)([dhms]))?$/i
  const match = timeString.match(regex)

  if (!match) return null

  let milliseconds = 0

  for (let i = 1; i < match.length; i += 2) {
    if (!match[i]) continue

    const value = Number.parseInt(match[i])
    const unit = match[i + 1]?.toLowerCase()

    if (isNaN(value) || !unit) continue

    switch (unit) {
      case "d":
        milliseconds += value * 24 * 60 * 60 * 1000
        break
      case "h":
        milliseconds += value * 60 * 60 * 1000
        break
      case "m":
        milliseconds += value * 60 * 1000
        break
      case "s":
        milliseconds += value * 1000
        break
    }
  }

  return milliseconds
}
