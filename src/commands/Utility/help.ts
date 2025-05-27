import { SlashCommandBuilder, type ChatInputCommandInteraction, EmbedBuilder } from "discord.js"
import { config } from "../../utils/config"
import { botInfo } from "../../utils/bot-info"
import type { Command } from "../../utils/types"

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
      .setTitle(`Command: /${commandName}`)
      .setDescription(command.data?.description || "No description available")
      .setColor(botInfo.colors.primary)
      .addFields({
        name: "Type",
        value: "Slash Command",
        inline: true,
      })

    return interaction.reply({ embeds: [embed], ephemeral: true })
  }

  // Show all commands
  const embed = new EmbedBuilder()
    .setTitle("Available Commands")
    .setDescription(
      `**Slash Commands (/)**: Use \`/help [command]\` for more info on a specific command.\n**Developer Commands**: Developers can use prefix commands with \`${config.prefix}\` for administrative functions.`,
    )
    .setColor(botInfo.colors.primary)
    .setFooter({ text: `${config.botName} • Slash Commands: / • Developer Prefix: ${config.prefix}` })

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
      name: `${category} (Slash Commands)`,
      value: commands.map((cmd) => `\`/${cmd}\``).join(", ") || "No commands",
    })
  })

  // Add note about developer commands
  embed.addFields({
    name: "Developer Commands",
    value: `Developers have access to additional prefix commands using \`${config.prefix}\`. These include server management, blacklist control, and maintenance tools.`,
  })

  return interaction.reply({ embeds: [embed], ephemeral: true })
}
