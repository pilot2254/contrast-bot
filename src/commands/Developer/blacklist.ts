import { SlashCommandBuilder, type ChatInputCommandInteraction, type Message, EmbedBuilder } from "discord.js"
import { botInfo } from "../../utils/bot-info"
import { isDeveloper, logUnauthorizedAttempt } from "../../utils/permissions"
import { blacklistUser, unblacklistUser, getBlacklistedUsers } from "../../utils/blacklist-manager"
import { logger } from "../../utils/logger"

// Slash command definition
export const data = new SlashCommandBuilder()
  .setName("blacklist")
  .setDescription("Manages the bot's blacklist")
  .addSubcommand((subcommand) =>
    subcommand
      .setName("add")
      .setDescription("Adds a user to the blacklist")
      .addUserOption((option) => option.setName("user").setDescription("The user to blacklist").setRequired(true))
      .addStringOption((option) =>
        option.setName("reason").setDescription("The reason for blacklisting").setRequired(false),
      ),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("remove")
      .setDescription("Removes a user from the blacklist")
      .addUserOption((option) => option.setName("user").setDescription("The user to unblacklist").setRequired(true)),
  )
  .addSubcommand((subcommand) => subcommand.setName("list").setDescription("Lists all blacklisted users"))

// Slash command execution
export async function execute(interaction: ChatInputCommandInteraction) {
  // Direct ID check as a fallback
  const userId = String(interaction.user.id).trim()
  logger.info(`Blacklist command attempted by user ID: "${userId}"`)

  // Check if user is a developer using both methods
  const isDev = isDeveloper(interaction.user) || userId === "171395713064894465"

  if (!isDev) {
    logUnauthorizedAttempt(userId, "blacklist")
    logger.warn(`Permission denied for blacklist command. User ID: ${userId}`)
    return interaction.reply({ content: "You don't have permission to use this command.", ephemeral: true })
  }

  logger.info(`Blacklist command authorized for user ${userId}`)

  const subcommand = interaction.options.getSubcommand()

  if (subcommand === "add") {
    const user = interaction.options.getUser("user", true)
    const reason = interaction.options.getString("reason") || "No reason provided"

    // Don't allow blacklisting developers
    if (isDeveloper(user) || String(user.id).trim() === "171395713064894465") {
      return interaction.reply({ content: "You cannot blacklist a developer.", ephemeral: true })
    }

    const success = await blacklistUser(user.id)

    if (success) {
      const embed = new EmbedBuilder()
        .setTitle("User Blacklisted")
        .setDescription(`${user.tag} has been blacklisted from using the bot.`)
        .setColor(botInfo.colors.error)
        .addFields({ name: "Reason", value: reason })
        .setFooter({ text: `Blacklisted by ${interaction.user.tag}` })
        .setTimestamp()

      await interaction.reply({ embeds: [embed], ephemeral: true })
    } else {
      await interaction.reply({ content: "That user is already blacklisted.", ephemeral: true })
    }
  } else if (subcommand === "remove") {
    const user = interaction.options.getUser("user", true)
    const success = await unblacklistUser(user.id)

    if (success) {
      const embed = new EmbedBuilder()
        .setTitle("User Unblacklisted")
        .setDescription(`${user.tag} has been removed from the blacklist.`)
        .setColor(botInfo.colors.success)
        .setFooter({ text: `Unblacklisted by ${interaction.user.tag}` })
        .setTimestamp()

      await interaction.reply({ embeds: [embed], ephemeral: true })
    } else {
      await interaction.reply({ content: "That user is not blacklisted.", ephemeral: true })
    }
  } else if (subcommand === "list") {
    const blacklistedUsers = await getBlacklistedUsers()

    if (blacklistedUsers.length === 0) {
      return interaction.reply({ content: "There are no blacklisted users.", ephemeral: true })
    }

    // Fetch user data for each blacklisted user
    const userPromises = blacklistedUsers.map((id) => interaction.client.users.fetch(id.userId).catch(() => null))
    const users = await Promise.all(userPromises)
    const validUsers = users.filter((user) => user !== null)

    const embed = new EmbedBuilder()
      .setTitle("Blacklisted Users")
      .setColor(botInfo.colors.error)
      .setDescription(
        validUsers.length > 0
          ? validUsers.map((user) => `${user?.tag} (${user?.id})`).join("\n")
          : "Could not fetch user data for blacklisted IDs.",
      )
      .setFooter({ text: `Requested by ${interaction.user.tag}` })
      .setTimestamp()

    await interaction.reply({ embeds: [embed], ephemeral: true })
  }
}

// Prefix command definition
export const name = "blacklist"
export const aliases = ["bl"]
export const description = "Manages the bot's blacklist"
export const usage = "<add/remove/list> [user] [reason]"

// Prefix command execution
export async function run(message: Message, args: string[]) {
  // Direct ID check as a fallback
  const userId = String(message.author.id).trim()
  logger.info(`Blacklist command attempted by user ID: "${userId}"`)

  // Check if user is a developer using both methods
  const isDev = isDeveloper(message.author) || userId === "171395713064894465"

  if (!isDev) {
    logUnauthorizedAttempt(userId, "blacklist")
    logger.warn(`Permission denied for blacklist command. User ID: ${userId}`)
    return message.reply("You don't have permission to use this command.")
  }

  logger.info(`Blacklist command authorized for user ${userId}`)

  if (!args.length) {
    return message.reply(`Usage: ${usage}`)
  }

  const subcommand = args[0].toLowerCase()

  if (subcommand === "add") {
    if (args.length < 2) {
      return message.reply("Please provide a user to blacklist.")
    }

    let user
    try {
      user = message.mentions.users.first() || (await message.client.users.fetch(args[1]))
    } catch {
      return message.reply("Could not find that user.")
    }

    // Don't allow blacklisting developers
    if (isDeveloper(user) || String(user.id).trim() === "171395713064894465") {
      return message.reply("You cannot blacklist a developer.")
    }

    const reason = args.slice(2).join(" ") || "No reason provided"
    const success = await blacklistUser(user.id)

    if (success) {
      const embed = new EmbedBuilder()
        .setTitle("User Blacklisted")
        .setDescription(`${user.tag} has been blacklisted from using the bot.`)
        .setColor(botInfo.colors.error)
        .addFields({ name: "Reason", value: reason })
        .setFooter({ text: `Blacklisted by ${message.author.tag}` })
        .setTimestamp()

      await message.reply({ embeds: [embed] })
    } else {
      await message.reply("That user is already blacklisted.")
    }
  } else if (subcommand === "remove") {
    if (args.length < 2) {
      return message.reply("Please provide a user to unblacklist.")
    }

    let user
    try {
      user = message.mentions.users.first() || (await message.client.users.fetch(args[1]))
    } catch {
      return message.reply("Could not find that user.")
    }

    const success = await unblacklistUser(user.id)

    if (success) {
      const embed = new EmbedBuilder()
        .setTitle("User Unblacklisted")
        .setDescription(`${user.tag} has been removed from the blacklist.`)
        .setColor(botInfo.colors.success)
        .setFooter({ text: `Unblacklisted by ${message.author.tag}` })
        .setTimestamp()

      await message.reply({ embeds: [embed] })
    } else {
      await message.reply("That user is not blacklisted.")
    }
  } else if (subcommand === "list") {
    const blacklistedUsers = await getBlacklistedUsers()

    if (blacklistedUsers.length === 0) {
      return message.reply("There are no blacklisted users.")
    }

    // Fetch user data for each blacklisted user
    const userPromises = blacklistedUsers.map((id) => message.client.users.fetch(id.userId).catch(() => null))
    const users = await Promise.all(userPromises)
    const validUsers = users.filter((user) => user !== null)

    const embed = new EmbedBuilder()
      .setTitle("Blacklisted Users")
      .setColor(botInfo.colors.error)
      .setDescription(
        validUsers.length > 0
          ? validUsers.map((user) => `${user?.tag} (${user?.id})`).join("\n")
          : "Could not fetch user data for blacklisted IDs.",
      )
      .setFooter({ text: `Requested by ${message.author.tag}` })
      .setTimestamp()

    await message.reply({ embeds: [embed] })
  } else {
    await message.reply(`Unknown subcommand. Use 'add', 'remove', or 'list'.`)
  }
}
