import { SlashCommandBuilder, type ChatInputCommandInteraction, type Message, EmbedBuilder } from "discord.js"
import { config } from "../utils/config"
import { botInfo } from "../utils/bot-info"
import type { Command } from "../utils/types"

// Slash command definition
export const data = new SlashCommandBuilder()
  .setName("help")
  .setDescription("Shows a list of available commands")
  .addStringOption((option) =>
    option.setName("command").setDescription("Get info about a specific command").setRequired(false),
  )

// Slash command execution
export async function execute(interaction: ChatInputCommandInteraction) {
  const commandName = interaction.options.getString("command")

  if (commandName) {
    // Show help for a specific command
    const command = interaction.client.commands.get(commandName)

    if (!command) {
      return interaction.reply({ content: `Command \`${commandName}\` not found.`, ephemeral: true })
    }

    const embed = new EmbedBuilder()
      .setTitle(`Command: ${commandName}`)
      .setDescription(command.data?.description || "No description available")
      .setColor(botInfo.colors.primary)

    return interaction.reply({ embeds: [embed], ephemeral: true })
  }

  // Show all commands
  const embed = new EmbedBuilder()
    .setTitle("Available Commands")
    .setDescription(
      `Use \`/help [command]\` or \`${config.prefix}help [command]\` for more info on a specific command.`,
    )
    .setColor(botInfo.colors.primary)
    .setFooter({ text: `${config.botName} • Prefix: ${config.prefix}` })

  // Group commands by category
  const categories = new Map<string, string[]>()

  interaction.client.commands.forEach((command: Command) => {
    const category = command.category || "Miscellaneous"
    if (!categories.has(category)) {
      categories.set(category, [])
    }
    categories.get(category)?.push(command.data?.name || "")
  })

  // Add fields for each category
  categories.forEach((commands, category) => {
    embed.addFields({
      name: category,
      value: commands.map((cmd) => `\`${cmd}\``).join(", ") || "No commands",
    })
  })

  return interaction.reply({ embeds: [embed], ephemeral: true })
}

// Prefix command definition
export const name = "help"
export const aliases = ["commands", "cmds"]
export const description = "Shows a list of available commands"
export const category = "Utility"

// Prefix command execution
export async function run(message: Message, args: string[]) {
  const commandName = args[0]

  if (commandName) {
    // Show help for a specific command
    const command =
      message.client.prefixCommands.get(commandName) ||
      [...message.client.prefixCommands.values()].find((cmd) => cmd.aliases?.includes(commandName))

    if (!command) {
      return message.reply(`Command \`${commandName}\` not found.`)
    }

    const embed = new EmbedBuilder()
      .setTitle(`Command: ${commandName}`)
      .setDescription(command.description || "No description available")
      .setColor(botInfo.colors.primary)

    if (command.aliases?.length) {
      embed.addFields({ name: "Aliases", value: command.aliases.map((a: string) => `\`${a}\``).join(", ") })
    }

    if (command.usage) {
      embed.addFields({ name: "Usage", value: `\`${config.prefix}${commandName} ${command.usage}\`` })
    }

    return message.reply({ embeds: [embed] })
  }

  // Show all commands
  const embed = new EmbedBuilder()
    .setTitle("Available Commands")
    .setDescription(`Use \`${config.prefix}help [command]\` for more info on a specific command.`)
    .setColor(botInfo.colors.primary)
    .setFooter({ text: `${config.botName} • Prefix: ${config.prefix}` })

  // Group commands by category
  const categories = new Map<string, string[]>()

  message.client.prefixCommands.forEach((command: Command) => {
    const category = command.category || "Miscellaneous"
    if (!categories.has(category)) {
      categories.set(category, [])
    }
    categories.get(category)?.push(command.name || "")
  })

  // Add fields for each category
  categories.forEach((commands, category) => {
    embed.addFields({
      name: category,
      value: commands.map((cmd) => `\`${cmd}\``).join(", ") || "No commands",
    })
  })

  return message.reply({ embeds: [embed] })
}
