import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type Message,
  EmbedBuilder,
  type TextChannel,
} from "discord.js"
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

// Prefix command definition
export const name = "remind"
export const aliases = ["reminder", "remindme"]
export const description = "Sets a reminder"
export const usage = "<me/list/cancel> [time] [message]"

// Prefix command execution
export async function run(message: Message, args: string[]) {
  if (!args.length) {
    return message.reply(`Usage: ${usage}`)
  }

  const subcommand = args[0].toLowerCase()

  if (subcommand === "me") {
    if (args.length < 3) {
      return message.reply("Please provide a time and a message.")
    }

    const timeString = args[1]
    const messageText = args.slice(2).join(" ")

    const milliseconds = parseTimeString(timeString)
    if (milliseconds === null) {
      return message.reply("Invalid time format. Use formats like 1h30m, 2d, 30s.")
    }

    if (milliseconds < 1000) {
      return message.reply("Reminder time must be at least 1 second.")
    }

    if (milliseconds > 1000 * 60 * 60 * 24 * 7) {
      return message.reply("Reminder time cannot be more than 7 days.")
    }

    createReminder(message.author, message.channel as TextChannel, messageText, milliseconds)

    const embed = new EmbedBuilder()
      .setTitle("Reminder Set")
      .setDescription(`I'll remind you: ${messageText}`)
      .setColor(botInfo.colors.primary)
      .addFields({ name: "When", value: `<t:${Math.floor((Date.now() + milliseconds) / 1000)}:R>` })
      .setFooter({ text: `Requested by ${message.author.tag}` })
      .setTimestamp()

    await message.reply({ embeds: [embed] })
  } else if (subcommand === "list") {
    const reminders = getUserReminders(message.author.id)

    if (reminders.length === 0) {
      return message.reply("You don't have any active reminders.")
    }

    const embed = new EmbedBuilder()
      .setTitle("Your Reminders")
      .setColor(botInfo.colors.primary)
      .setFooter({ text: `Requested by ${message.author.tag}` })
      .setTimestamp()

    reminders.forEach((reminder, index) => {
      embed.addFields({
        name: `${index + 1}. <t:${Math.floor(reminder.timestamp / 1000)}:R>`,
        value: reminder.message,
      })
    })

    await message.reply({ embeds: [embed] })
  } else if (subcommand === "cancel") {
    if (args.length < 2) {
      return message.reply("Please provide the index of the reminder to cancel.")
    }

    const index = Number.parseInt(args[1])
    if (isNaN(index) || index < 1) {
      return message.reply("Please provide a valid reminder index.")
    }

    const reminders = getUserReminders(message.author.id)

    if (reminders.length === 0) {
      return message.reply("You don't have any active reminders.")
    }

    if (index > reminders.length) {
      return message.reply(`You only have ${reminders.length} reminder${reminders.length === 1 ? "" : "s"}.`)
    }

    const reminder = reminders[index - 1]
    cancelReminder(reminder.id)

    await message.reply(`Cancelled reminder: ${reminder.message}`)
  } else {
    await message.reply(`Unknown subcommand. Use 'me', 'list', or 'cancel'.`)
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
