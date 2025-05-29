import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import { ShopService } from "../../services/ShopService";
import { CustomEmbedBuilder } from "../../utils/EmbedBuilder";
import { config } from "../../config/bot.config";
import { Pagination } from "../../utils/Pagination";
import type { ExtendedClient } from "../../structures/ExtendedClient";
import type { Command } from "../../types/Command";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("shop")
    .setDescription("Browse and buy items from the shop")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("list")
        .setDescription("List available items in the shop")
        .addStringOption((option) =>
          option
            .setName("category")
            .setDescription("Filter by category")
            .setRequired(false)
            .addChoices(
              { name: "Upgrades", value: "upgrades" },
              { name: "Items", value: "items" },
              { name: "Boosts", value: "boosts" },
            ),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("buy")
        .setDescription("Buy an item from the shop")
        .addStringOption((option) =>
          option
            .setName("id")
            .setDescription("The ID of the item to buy")
            .setRequired(true),
        ),
    ),
  category: "economy",
  cooldown: 3,
  async execute(
    interaction: ChatInputCommandInteraction,
    client: ExtendedClient,
  ) {
    const subcommand = interaction.options.getSubcommand();
    const shopService = new ShopService(client);

    if (subcommand === "list") {
      await handleShopList(interaction, client, shopService);
    } else if (subcommand === "buy") {
      await handleShopBuy(interaction, client, shopService);
    }
  },
};

// Handle shop list
async function handleShopList(
  interaction: ChatInputCommandInteraction,
  client: ExtendedClient,
  shopService: ShopService,
) {
  const category = interaction.options.getString("category");

  // Pass user ID for dynamic pricing
  const items = await shopService.getShopItems(
    category || undefined,
    interaction.user.id,
  );

  if (items.length === 0) {
    const embed = CustomEmbedBuilder.info().setDescription(
      "No items found in the shop.",
    );
    await interaction.reply({ embeds: [embed] });
    return;
  }

  // Group items by category if no category filter
  const itemsByCategory: Record<string, any[]> = {};

  if (!category) {
    items.forEach((item) => {
      if (!itemsByCategory[item.category]) {
        itemsByCategory[item.category] = [];
      }
      itemsByCategory[item.category].push(item);
    });
  } else {
    itemsByCategory[category] = items;
  }

  // Create pages
  const pages: any[] = [];

  Object.entries(itemsByCategory).forEach(([cat, catItems]) => {
    const embed = CustomEmbedBuilder.economy()
      .setTitle(`🛒 Shop - ${cat.charAt(0).toUpperCase() + cat.slice(1)}`)
      .setDescription("Use `/shop buy <id>` to purchase an item");

    catItems.forEach((item) => {
      const priceText =
        item.price > 0
          ? `${item.price.toLocaleString()} ${config.economy.currency.symbol}`
          : "Dynamic pricing";

      embed.addFields({
        name: `${item.name} - ${priceText}`,
        value: `${item.description}\nID: \`${item.id}\``,
        inline: false,
      });
    });

    pages.push(embed);
  });

  // Use pagination if multiple pages
  if (pages.length > 1) {
    const pagination = new Pagination(interaction, pages);
    await pagination.start();
  } else {
    await interaction.reply({ embeds: [pages[0]] });
  }
}

// Handle shop buy
async function handleShopBuy(
  interaction: ChatInputCommandInteraction,
  client: ExtendedClient,
  shopService: ShopService,
) {
  const itemId = interaction.options.getString("id")!;

  try {
    // Buy item
    const { success, item } = await shopService.buyItem(
      interaction.user.id,
      itemId,
    );

    if (success) {
      const embed = CustomEmbedBuilder.success()
        .setTitle("Purchase Successful!")
        .setDescription(
          `You bought **${item.name}** for ${item.price.toLocaleString()} ${config.economy.currency.symbol}`,
        );

      if (item.category === "boosts" && item.xpAmount) {
        embed.addFields({
          name: "✨ XP Gained",
          value: `+${item.xpAmount} XP`,
          inline: true,
        });
      }

      if (item.category === "upgrades" && item.id === "safe_upgrade") {
        embed.addFields({
          name: "🔒 Safe Upgraded",
          value: "Your safe capacity has been increased!",
          inline: true,
        });
      }

      await interaction.reply({ embeds: [embed] });
    }
  } catch (error: any) {
    const errorEmbed = client.errorHandler.createUserError(error.message);
    await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
  }
}

export default command;
