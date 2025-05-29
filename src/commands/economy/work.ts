import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import { WorkManager } from "../../utils/WorkManager";
import { CustomEmbedBuilder } from "../../utils/EmbedBuilder";
import { config } from "../../config/bot.config";
import type { ExtendedClient } from "../../structures/ExtendedClient";
import type { Command } from "../../types/Command";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("work")
    .setDescription("Work to earn coins"),
  category: "economy",
  cooldown: 10, // 10 seconds cooldown as specified in requirements
  async execute(
    interaction: ChatInputCommandInteraction,
    client: ExtendedClient,
  ) {
    const workManager = new WorkManager(client);

    try {
      // Check if user can work
      const { canWork, timeLeft } = await workManager.canWork(
        interaction.user.id,
      );

      if (!canWork) {
        const seconds = Math.ceil(timeLeft / 1000);
        const errorEmbed = client.errorHandler.createUserError(
          `You need to wait ${seconds} second${seconds !== 1 ? "s" : ""} before working again.`,
        );
        await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        return;
      }

      // Perform work
      const result = await workManager.work(interaction.user.id);

      // Create embed
      const embed = CustomEmbedBuilder.economy()
        .setTitle("💼 Work Completed")
        .setDescription(result.message)
        .addFields(
          {
            name: "💰 Earned",
            value: `${result.reward.toLocaleString()} ${config.economy.currency.symbol}`,
            inline: true,
          },
          {
            name: "✨ XP Gained",
            value: `+${result.xpGained} XP`,
            inline: true,
          },
        );

      // Add level up notification if applicable
      if (result.leveledUp) {
        embed.addFields({
          name: "🎉 Level Up!",
          value: `You reached level ${result.newLevel}!`,
          inline: true,
        });
      }

      await interaction.reply({ embeds: [embed] });
    } catch (error: any) {
      client.logger.error("Error in work command:", error);
      const errorEmbed = client.errorHandler.createUserError(error.message);
      await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
  },
};

export default command;
