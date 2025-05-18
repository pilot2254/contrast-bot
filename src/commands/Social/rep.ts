import { SlashCommandBuilder, type ChatInputCommandInteraction, type Message, EmbedBuilder } from "discord.js"
import { botInfo } from "../../utils/bot-info"
import { givePositiveRep, giveNegativeRep, getUserReputation } from "../../utils/reputation-manager"

// Slash command definition
export const data = new SlashCommandBuilder()
  .setName("rep")
  .setDescription("Manages user reputation")
  .addSubcommand((subcommand) =>
    subcommand
      .setName("give")
      .setDescription("Gives positive reputation to a user")
      .addUserOption((option) =>
        option.setName("user").setDescription("The user to give reputation to").setRequired(true),
      ),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("take")
      .setDescription("Gives negative reputation to a user")
      .addUserOption((option) =>
        option.setName("user").setDescription("The user to give negative reputation to").setRequired(true),
      ),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("check")
      .setDescription("Checks a user's reputation")
      .addUserOption((option) =>
        option.setName("user").setDescription("The user to check (defaults to yourself)").setRequired(false),
      ),
  )

// Slash command execution
export async function execute(interaction: ChatInputCommandInteraction) {
  const subcommand = interaction.options.getSubcommand()

  if (subcommand === "give") {
    const targetUser = interaction.options.getUser("user", true)

    const result = givePositiveRep(interaction.user.id, interaction.user.username, targetUser.id, targetUser.username)

    if (result.success) {
      const embed = new EmbedBuilder()
        .setTitle("Reputation Given")
        .setDescription(`${botInfo.emojis.success} ${result.message}`)
        .setColor(botInfo.colors.success)
        .setFooter({ text: `Requested by ${interaction.user.tag}` })
        .setTimestamp()

      await interaction.reply({ embeds: [embed] })
    } else {
      await interaction.reply({
        content: `${botInfo.emojis.error} ${result.message}`,
        ephemeral: true,
      })
    }
  } else if (subcommand === "take") {
    const targetUser = interaction.options.getUser("user", true)

    const result = giveNegativeRep(interaction.user.id, interaction.user.username, targetUser.id, targetUser.username)

    if (result.success) {
      const embed = new EmbedBuilder()
        .setTitle("Reputation Given")
        .setDescription(`${botInfo.emojis.warning} ${result.message}`)
        .setColor(botInfo.colors.warning)
        .setFooter({ text: `Requested by ${interaction.user.tag}` })
        .setTimestamp()

      await interaction.reply({ embeds: [embed] })
    } else {
      await interaction.reply({
        content: `${botInfo.emojis.error} ${result.message}`,
        ephemeral: true,
      })
    }
  } else if (subcommand === "check") {
    const targetUser = interaction.options.getUser("user") || interaction.user
    const repData = getUserReputation(targetUser.id)

    if (!repData) {
      return interaction.reply({
        content: `${targetUser.id === interaction.user.id ? "You don't" : `${targetUser.username} doesn't`} have any reputation yet.`,
        ephemeral: true,
      })
    }

    const embed = new EmbedBuilder()
      .setTitle(`${targetUser.username}'s Reputation`)
      .setColor(botInfo.colors.primary)
      .addFields(
        {
          name: "Received",
          value: `Positive: ${repData.receivedPositive} | Negative: ${repData.receivedNegative}`,
          inline: false,
        },
        {
          name: "Given",
          value: `Positive: ${repData.givenPositive} | Negative: ${repData.givenNegative}`,
          inline: false,
        },
        {
          name: "Total",
          value: `Received: ${repData.receivedPositive - repData.receivedNegative} | Given: ${repData.givenPositive - repData.givenNegative}`,
          inline: false,
        },
      )
      .setFooter({ text: `Requested by ${interaction.user.tag}` })
      .setTimestamp()

    await interaction.reply({ embeds: [embed] })
  }
}

// Prefix command definition
export const name = "rep"
export const aliases = ["reputation"]
export const description = "Manages user reputation"
export const usage = "give <user> | take <user> | check [user]"

// Prefix command execution
export async function run(message: Message, args: string[]) {
  if (!args.length) {
    return message.reply(`Usage: ${usage}`)
  }

  const subcommand = args[0].toLowerCase()

  if (subcommand === "give") {
    if (args.length < 2) {
      return message.reply("Please specify a user to give reputation to.")
    }

    const targetUser = message.mentions.users.first()
    if (!targetUser) {
      return message.reply("Please mention a user to give reputation to.")
    }

    const result = givePositiveRep(message.author.id, message.author.username, targetUser.id, targetUser.username)

    if (result.success) {
      const embed = new EmbedBuilder()
        .setTitle("Reputation Given")
        .setDescription(`${botInfo.emojis.success} ${result.message}`)
        .setColor(botInfo.colors.success)
        .setFooter({ text: `Requested by ${message.author.tag}` })
        .setTimestamp()

      await message.reply({ embeds: [embed] })
    } else {
      await message.reply(`${botInfo.emojis.error} ${result.message}`)
    }
  } else if (subcommand === "take") {
    if (args.length < 2) {
      return message.reply("Please specify a user to give negative reputation to.")
    }

    const targetUser = message.mentions.users.first()
    if (!targetUser) {
      return message.reply("Please mention a user to give negative reputation to.")
    }

    const result = giveNegativeRep(message.author.id, message.author.username, targetUser.id, targetUser.username)

    if (result.success) {
      const embed = new EmbedBuilder()
        .setTitle("Reputation Given")
        .setDescription(`${botInfo.emojis.warning} ${result.message}`)
        .setColor(botInfo.colors.warning)
        .setFooter({ text: `Requested by ${message.author.tag}` })
        .setTimestamp()

      await message.reply({ embeds: [embed] })
    } else {
      await message.reply(`${botInfo.emojis.error} ${result.message}`)
    }
  } else if (subcommand === "check") {
    const targetUser = message.mentions.users.first() || message.author
    const repData = getUserReputation(targetUser.id)

    if (!repData) {
      return message.reply(
        `${targetUser.id === message.author.id ? "You don't" : `${targetUser.username} doesn't`} have any reputation yet.`,
      )
    }

    const embed = new EmbedBuilder()
      .setTitle(`${targetUser.username}'s Reputation`)
      .setColor(botInfo.colors.primary)
      .addFields(
        {
          name: "Received",
          value: `Positive: ${repData.receivedPositive} | Negative: ${repData.receivedNegative}`,
          inline: false,
        },
        {
          name: "Given",
          value: `Positive: ${repData.givenPositive} | Negative: ${repData.givenNegative}`,
          inline: false,
        },
        {
          name: "Total",
          value: `Received: ${repData.receivedPositive - repData.receivedNegative} | Given: ${repData.givenPositive - repData.givenNegative}`,
          inline: false,
        },
      )
      .setFooter({ text: `Requested by ${message.author.tag}` })
      .setTimestamp()

    await message.reply({ embeds: [embed] })
  } else {
    await message.reply(`Unknown subcommand. Usage: ${usage}`)
  }
}
