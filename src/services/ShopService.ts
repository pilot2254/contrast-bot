import type { ExtendedClient } from "../structures/ExtendedClient"
import { config } from "../config/bot.config"
import { LevelingService } from "./LevelingService"
import { EconomyService } from "./EconomyService" // Import directly

// Define interfaces for shop items and inventory
interface ShopItemBase {
  id: string
  name: string
  description: string
  category: "upgrades" | "boosts" | "general" | string // Allow other categories
  price: number // Base price, can be overridden for dynamic items
  emoji?: string
  stackable?: boolean
  requiredLevel?: number
  xpAmount?: number // For XP boosts
}

// Specific item types can extend ShopItemBase if needed
// interface XpBoostItem extends ShopItemBase {
//   category: "boosts";
//   xpAmount: number;
// }

type ShopItem = ShopItemBase // For now, ShopItemBase is sufficient

interface InventoryItemRecord {
  item_id: string
  quantity: number
  purchased_at: string // ISO Date string
}

interface UserInventoryItem extends InventoryItemRecord, ShopItem {}

interface UserSafeUpgradeInfo {
  tier: number
  capacity: number
  nextUpgradeCost: number
}

interface UserUpgrades {
  safe: UserSafeUpgradeInfo
  // other upgrades...
}

export class ShopService {
  constructor(private client: ExtendedClient) {}

  async getShopItems(category?: string, userId?: string): Promise<ShopItem[]> {
    const items: ShopItem[] = Object.values(config.shop.items)
    let processedItems = items

    if (category) {
      processedItems = items.filter((item) => item.category === category)
    }

    if (userId) {
      return Promise.all(
        processedItems.map(async (item) => {
          if (item.id === "safe_upgrade") {
            const user = await this.client.database.getUser(userId)
            const upgradeCost = Math.floor(
              config.economy.safe.baseCost * Math.pow(config.economy.safe.upgradeMultiplier, user.safe_tier - 1), // safe_tier is 1-based
            )
            return { ...item, price: upgradeCost }
          }
          return item
        }),
      )
    }
    return processedItems
  }

  getItemById(itemId: string): ShopItem | undefined {
    return config.shop.items[itemId as keyof typeof config.shop.items] as ShopItem | undefined
  }

  async getItemByIdWithPricing(itemId: string, userId: string): Promise<ShopItem | null> {
    const item = this.getItemById(itemId)
    if (!item) return null

    if (item.id === "safe_upgrade") {
      const user = await this.client.database.getUser(userId)
      const currentTier = user.safe_tier || 1 // Default to tier 1 if not set
      const upgradeCost = Math.floor(
        config.economy.safe.baseCost * Math.pow(config.economy.safe.upgradeMultiplier, currentTier - 1),
      )
      return { ...item, price: upgradeCost }
    }
    return item
  }

  async buyItem(userId: string, itemId: string): Promise<{ success: boolean; item: ShopItem }> {
    const item = await this.getItemByIdWithPricing(itemId, userId)
    if (!item) throw new Error("Item not found")

    const user = await this.client.database.getUser(userId)
    if (user.balance < item.price) {
      throw new Error(`You don't have enough ${config.economy.currency.name} to buy this item`)
    }
    if (item.requiredLevel && user.level < item.requiredLevel) {
      throw new Error(`You need to be level ${item.requiredLevel} to buy this item.`)
    }

    // Use a transaction for the entire buy operation
    return this.client.database.transaction(async () => {
      // Deduct balance (use EconomyService for consistency if it handles transactions)
      const economyService = new EconomyService(this.client)
      await economyService._removeBalanceInternal(userId, item.price, `Purchased ${item.name}`)

      if (item.category === "upgrades" && itemId === "safe_upgrade") {
        await economyService.upgradeSafe(userId) // This should handle its own DB updates for user's safe
      } else if (item.category === "boosts" && itemId === "xp_boost" && item.xpAmount) {
        const levelingService = new LevelingService(this.client)
        await levelingService.addXP(userId, item.xpAmount, "XP Boost item")
      } else {
        // Regular inventory item
        const existingItem = await this.client.database.get<InventoryItemRecord>(
          "SELECT quantity FROM inventory WHERE user_id = ? AND item_id = ?",
          [userId, itemId],
        )

        if (existingItem && item.stackable) {
          await this.client.database.run(
            "UPDATE inventory SET quantity = quantity + ? WHERE user_id = ? AND item_id = ?",
            [existingItem.quantity + 1, userId, itemId], // Correctly increment
          )
        } else if (!existingItem) {
          await this.client.database.run("INSERT INTO inventory (user_id, item_id, quantity) VALUES (?, ?, 1)", [
            userId,
            itemId,
          ])
        } else {
          // Item exists but is not stackable
          throw new Error("You already own this item and it cannot be stacked.")
        }
      }
      return { success: true, item }
    })
  }

  async getUserInventory(userId: string): Promise<UserInventoryItem[]> {
    const inventoryRecords = await this.client.database.all<InventoryItemRecord>(
      "SELECT item_id, quantity, purchased_at FROM inventory WHERE user_id = ?",
      [userId],
    )
    return inventoryRecords
      .map((invRec) => {
        const itemDetails = this.getItemById(invRec.item_id)
        if (!itemDetails) return null
        return { ...invRec, ...itemDetails }
      })
      .filter((item): item is UserInventoryItem => item !== null)
  }

  async getUserUpgrades(userId: string): Promise<UserUpgrades> {
    const user = await this.client.database.getUser(userId)
    const currentTier = user.safe_tier || 1
    return {
      safe: {
        tier: currentTier,
        capacity: user.safe_capacity,
        nextUpgradeCost: Math.floor(
          config.economy.safe.baseCost * Math.pow(config.economy.safe.upgradeMultiplier, currentTier - 1),
        ),
      },
    }
  }
}
