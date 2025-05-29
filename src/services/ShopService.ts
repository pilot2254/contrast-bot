import type { ExtendedClient } from "../structures/ExtendedClient";
import { config } from "../config/bot.config";
import { LevelingService } from "./LevelingService";

export class ShopService {
  constructor(private client: ExtendedClient) {}

  // Get all shop items with dynamic pricing
  async getShopItems(category?: string, userId?: string): Promise<any[]> {
    const items = Object.values(config.shop.items);
    let processedItems = items;

    if (category) {
      processedItems = items.filter((item) => item.category === category);
    }

    // Add dynamic pricing for upgrades
    const itemsWithDynamicPricing = await Promise.all(
      processedItems.map(async (item) => {
        if (item.id === "safe_upgrade" && userId) {
          // Calculate dynamic price for safe upgrade
          const user = await this.client.database.getUser(userId);
          const upgradeCost = Math.floor(
            config.economy.safe.baseCost *
              Math.pow(
                config.economy.safe.upgradeMultiplier,
                user.safe_tier - 1,
              ),
          );
          return { ...item, price: upgradeCost };
        }
        return item;
      }),
    );

    return itemsWithDynamicPricing;
  }

  // Get item by ID
  getItemById(itemId: string): any {
    return config.shop.items[itemId as keyof typeof config.shop.items];
  }

  // Get item by ID with dynamic pricing
  async getItemByIdWithPricing(itemId: string, userId: string): Promise<any> {
    const item = this.getItemById(itemId);
    if (!item) return null;

    if (item.id === "safe_upgrade") {
      // Calculate dynamic price for safe upgrade
      const user = await this.client.database.getUser(userId);
      const upgradeCost = Math.floor(
        config.economy.safe.baseCost *
          Math.pow(config.economy.safe.upgradeMultiplier, user.safe_tier - 1),
      );
      return { ...item, price: upgradeCost };
    }

    return item;
  }

  // Buy an item
  async buyItem(
    userId: string,
    itemId: string,
  ): Promise<{ success: boolean; item: any }> {
    const item = await this.getItemByIdWithPricing(itemId, userId);

    if (!item) {
      throw new Error("Item not found");
    }

    // Check if user has enough balance
    const user = await this.client.database.getUser(userId);

    if (user.balance < item.price) {
      throw new Error(
        `You don't have enough ${config.economy.currency.name} to buy this item`,
      );
    }

    // Process purchase based on item type
    if (item.category === "upgrades") {
      if (itemId === "safe_upgrade") {
        // Safe upgrade is handled separately
        const economyService = await import("./EconomyService").then(
          (m) => new m.EconomyService(this.client),
        );
        await economyService.upgradeSafe(userId);
        return { success: true, item };
      }
    } else if (item.category === "boosts") {
      if (itemId === "xp_boost") {
        // Apply XP boost
        await this.client.database.transaction(async () => {
          // Remove balance
          const newBalance = user.balance - item.price;
          await this.client.database.updateUser(userId, {
            balance: newBalance,
          });

          // Log transaction
          await this.client.database.logTransaction(
            userId,
            "remove",
            item.price,
            `Purchased ${item.name}`,
          );

          // Add XP
          const levelingService = new LevelingService(this.client);
          await levelingService.addXP(userId, item.xpAmount, "XP Boost item");
        });

        return { success: true, item };
      }
    } else {
      // Regular inventory item
      await this.client.database.transaction(async () => {
        // Remove balance
        const newBalance = user.balance - item.price;
        await this.client.database.updateUser(userId, { balance: newBalance });

        // Log transaction
        await this.client.database.logTransaction(
          userId,
          "remove",
          item.price,
          `Purchased ${item.name}`,
        );

        // Check if item already exists in inventory
        const existingItem = await this.client.database.get(
          "SELECT * FROM inventory WHERE user_id = ? AND item_id = ?",
          [userId, itemId],
        );

        if (existingItem && item.stackable) {
          // Increment quantity for stackable items
          await this.client.database.run(
            "UPDATE inventory SET quantity = quantity + 1 WHERE user_id = ? AND item_id = ?",
            [userId, itemId],
          );
        } else if (!existingItem) {
          // Add new item to inventory
          await this.client.database.run(
            "INSERT INTO inventory (user_id, item_id, quantity) VALUES (?, ?, 1)",
            [userId, itemId],
          );
        } else {
          throw new Error("You already own this item and it cannot be stacked");
        }
      });
    }

    return { success: true, item };
  }

  // Get user's inventory
  async getUserInventory(userId: string): Promise<any[]> {
    const inventoryItems = await this.client.database.all(
      "SELECT item_id, quantity, purchased_at FROM inventory WHERE user_id = ?",
      [userId],
    );

    // Enrich with item details
    return inventoryItems
      .map((invItem) => {
        const itemDetails = this.getItemById(invItem.item_id);
        if (!itemDetails) return null; // Skip items that no longer exist in config
        return {
          ...invItem,
          ...itemDetails,
        };
      })
      .filter(Boolean); // Remove null entries
  }

  // Get user's upgrades
  async getUserUpgrades(userId: string): Promise<any> {
    const user = await this.client.database.getUser(userId);

    return {
      safe: {
        tier: user.safe_tier,
        capacity: user.safe_capacity,
        nextUpgradeCost: Math.floor(
          config.economy.safe.baseCost *
            Math.pow(config.economy.safe.upgradeMultiplier, user.safe_tier - 1),
        ),
      },
      // Add other upgrades here as needed
    };
  }
}
