import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import { StatsManager } from "../../utils/StatsManager";
import { CustomEmbedBuilder } from "../../utils/EmbedBuilder";
import type { ExtendedClient } from "../../structures/ExtendedClient";
import type { Command } from "../../types/Command";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("top-commands")
    .setDescription("View the most used commands"),
  category: "misc",
  cooldown: 5,
  async execute(
    interaction: ChatInputCommandInteraction,
    client: ExtendedClient,
  ) {
    const statsManager = new StatsManager(client);

    try {
      const topCommands = await statsManager.getTopCommands(10);

      if (topCommands.length === 0) {
        const embed = CustomEmbedBuilder.info().setDescription(
          "No command usage data available yet.",
        );
        await interaction.reply({ embeds: [embed] });
        return;
      }

      const embed = CustomEmbedBuilder.info()
        .setTitle("📊 Top Commands")
        .setDescription("The most frequently used commands");

      let description = "";
      topCommands.forEach((cmd, index) => {
        description += `**${index + 1}.** \`/${cmd.command_name}\` - ${cmd.usage_count.toLocaleString()} uses\n`;
      });

      embed.setDescription(description);
      await interaction.reply({ embeds: [embed] });
    } catch (error: any) {
      client.logger.error("Error in top-commands:", error);
      const errorEmbed = client.errorHandler.createUserError(
        "An error occurred while fetching command statistics.",
      );
      await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
  },
};

export default command;
