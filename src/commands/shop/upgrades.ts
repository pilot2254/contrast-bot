import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import { ShopService } from "../../services/ShopService";
import { CustomEmbedBuilder } from "../../utils/EmbedBuilder";
import { config } from "../../config/bot.config";
import type { ExtendedClient } from "../../structures/ExtendedClient";
import type { Command } from "../../types/Command";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("upgrades")
    .setDescription("View your upgrades or another user's upgrades")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The user to check")
        .setRequired(false),
    ),
  category: "economy",
  cooldown: 3,
  async execute(
    interaction: ChatInputCommandInteraction,
    client: ExtendedClient,
  ) {
    const targetUser = interaction.options.getUser("user") || interaction.user;
    const shopService = new ShopService(client);

    try {
      const upgrades = await shopService.getUserUpgrades(targetUser.id);

      const embed = CustomEmbedBuilder.economy()
        .setTitle(
          `${targetUser.id === interaction.user.id ? "Your" : `${targetUser.username}'s`} Upgrades`,
        )
        .setThumbnail(targetUser.displayAvatarURL())
        .addFields({
          name: "🔒 Safe Upgrade",
          value: `Tier: ${upgrades.safe.tier}\nCapacity: ${upgrades.safe.capacity.toLocaleString()} ${
            config.economy.currency.symbol
          }\nNext Upgrade: ${upgrades.safe.nextUpgradeCost.toLocaleString()} ${config.economy.currency.symbol}`,
          inline: false,
        });

      await interaction.reply({ embeds: [embed] });
    } catch (error: any) {
      const errorEmbed = client.errorHandler.createUserError(error.message);
      await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
  },
};

export default command;
