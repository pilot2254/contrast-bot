import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type EmbedBuilder,
  Collection,
} from "discord.js";
import { CustomEmbedBuilder } from "../../utils/EmbedBuilder";
import { config } from "../../config/bot.config";
import { Pagination } from "../../utils/Pagination";
import type { ExtendedClient } from "../../structures/ExtendedClient";
import type { Command } from "../../types/Command";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription(
      "View all available commands or get help for a specific command",
    )
    .addStringOption((option) =>
      option
        .setName("command")
        .setDescription("Get detailed help for a specific command")
        .setRequired(false),
    ),
  category: "misc",
  cooldown: 3,
  async execute(
    interaction: ChatInputCommandInteraction,
    client: ExtendedClient,
  ) {
    const commandName = interaction.options.getString("command");

    if (commandName) {
      await handleSpecificCommandHelp(interaction, client, commandName);
    } else {
      await handleGeneralHelp(interaction, client);
    }
  },
};

// Handle help for a specific command
async function handleSpecificCommandHelp(
  interaction: ChatInputCommandInteraction,
  client: ExtendedClient,
  commandName: string,
) {
  const command = client.commands.get(commandName);

  if (!command) {
    const errorEmbed = client.errorHandler.createUserError(
      `Command \`/${commandName}\` not found.`,
    );
    await interaction.reply({ embeds: [errorEmbed], flags: [64] }); // EPHEMERAL flag
    return;
  }

  // Get command data
  const { data, category, cooldown, developerOnly } = command;

  // Create embed
  const embed = CustomEmbedBuilder.info()
    .setTitle(`Command: /${data.name}`)
    .setDescription(data.description)
    .addFields({
      name: "Category",
      value: category.charAt(0).toUpperCase() + category.slice(1),
      inline: true,
    });

  if (cooldown) {
    embed.addFields({
      name: "Cooldown",
      value: `${cooldown} seconds`,
      inline: true,
    });
  }

  if (developerOnly) {
    embed.addFields({ name: "Developer Only", value: "Yes", inline: true });
  }

  // Add options if any
  if (data.options && data.options.length > 0) {
    let optionsText = "";

    // Handle subcommands
    const subcommands = data.options.filter((opt: any) => opt.type === 1);
    if (subcommands.length > 0) {
      optionsText += "**Subcommands:**\n";
      subcommands.forEach((sub: any) => {
        optionsText += `\`/${data.name} ${sub.name}\` - ${sub.description}\n`;
      });
    }

    // Handle options
    const regularOptions = data.options.filter((opt: any) => opt.type !== 1);
    if (regularOptions.length > 0) {
      if (optionsText) optionsText += "\n";
      optionsText += "**Options:**\n";
      regularOptions.forEach((opt: any) => {
        optionsText += `\`${opt.name}\` - ${opt.description}${opt.required ? " (Required)" : ""}\n`;
      });
    }

    if (optionsText) {
      embed.addFields({ name: "Usage", value: optionsText });
    }
  }

  await interaction.reply({ embeds: [embed] });
}

// Handle general help (list all commands)
async function handleGeneralHelp(
  interaction: ChatInputCommandInteraction,
  client: ExtendedClient,
) {
  // Group commands by category
  const categories = new Collection<string, Command[]>();

  client.commands.forEach((cmd) => {
    // Skip developer commands for non-developers
    if (
      cmd.developerOnly &&
      !config.bot.developers.includes(interaction.user.id)
    ) {
      return;
    }

    const category = cmd.category;
    if (!categories.has(category)) {
      categories.set(category, []);
    }
    categories.get(category)!.push(cmd);
  });

  // Create embeds for each category
  const embeds: EmbedBuilder[] = [];

  categories.forEach((commands, category) => {
    const embed = CustomEmbedBuilder.info()
      .setTitle(
        `${category.charAt(0).toUpperCase() + category.slice(1)} Commands`,
      )
      .setDescription(
        `Use \`/help <command>\` to get detailed information about a specific command.`,
      );

    let commandList = "";
    commands.forEach((cmd) => {
      commandList += `\`/${cmd.data.name}\` - ${cmd.data.description}\n`;
    });

    embed.addFields({ name: "Available Commands", value: commandList });
    embeds.push(embed);
  });

  // Add general information embed as the first page
  const infoEmbed = CustomEmbedBuilder.info()
    .setTitle(`${config.bot.name} Help`)
    .setDescription(
      `Welcome to the help menu! ${config.bot.name} is a feature-rich Discord bot with economy, gambling, and leveling systems.`,
    )
    .addFields(
      {
        name: "Categories",
        value: Array.from(categories.keys())
          .map((cat) => `• ${cat.charAt(0).toUpperCase() + cat.slice(1)}`)
          .join("\n"),
      },
      {
        name: "Support",
        value: `Join our [support server](${config.bot.supportServer}) for help.`,
      },
      {
        name: "Website",
        value: `Visit our [website](${config.bot.website}) for more information.`,
      },
    )
    .setFooter({ text: `${config.bot.name} v${config.bot.version}` });

  embeds.unshift(infoEmbed);

  // Use pagination for multiple embeds
  const pagination = new Pagination(interaction, embeds);
  await pagination.start();
}

export default command;
