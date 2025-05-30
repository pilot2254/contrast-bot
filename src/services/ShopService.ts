import type { ExtendedClient } from "../structures/ExtendedClient"
import { config } from "../config/bot.config"
import { LevelingService } from "./LevelingService"
import { EconomyService } from "./EconomyService"

// Define interfaces for shop items and inventory
export interface ShopItemBase {
  id: string
  name: string
  description: string
  category: "upgrades" | "boosts" | "items" | string
  price: number
  emoji?: string
  stackable?: boolean
  requiredLevel?: number
  xpAmount?: number
}

export type ShopItem = ShopItemBase

interface InventoryItemRecord {
  item_id: string
  quantity: number
  purchased_at: string
}

interface UserInventoryItem extends InventoryItemRecord, ShopItem {}

interface UserSafeUpgradeInfo {
  tier: number
  capacity: number
  nextUpgradeCost: number
  maxTier: number
  canUpgrade: boolean
}

interface UserUpgrades {
  safe: UserSafeUpgradeInfo
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
              config.economy.safe.baseCost *
                Math.pow(
                  config.economy.safe.upgradeMultiplier,
                  user.safe_tier - 1
                )
            )
            return { ...item, price: upgradeCost }
          }
          return item
        })
      )
    }
    return processedItems
  }

  getItemById(itemId: string): ShopItem | undefined {
    return config.shop.items[itemId as keyof typeof config.shop.items] as
      | ShopItem
      | undefined
  }

  async getItemByIdWithPricing(
    itemId: string,
    userId: string
  ): Promise<ShopItem | null> {
    const item = this.getItemById(itemId)
    if (!item) return null

    if (item.id === "safe_upgrade") {
      const user = await this.client.database.getUser(userId)
      const currentTier = user.safe_tier || 1
      const upgradeCost = Math.floor(
        config.economy.safe.baseCost *
          Math.pow(config.economy.safe.upgradeMultiplier, currentTier - 1)
      )
      return { ...item, price: upgradeCost }
    }
    return item
  }

  async buyItem(
    userId: string,
    itemId: string
  ): Promise<{ success: boolean; item: ShopItem }> {
    const item = await this.getItemByIdWithPricing(itemId, userId)
    if (!item) throw new Error("Item not found")

    const user = await this.client.database.getUser(userId)
    if (user.balance < item.price) {
      throw new Error(
        `You don't have enough ${config.economy.currency.name} to buy this item`
      )
    }
    if (item.requiredLevel && user.level < item.requiredLevel) {
      throw new Error(
        `You need to be level ${item.requiredLevel} to buy this item.`
      )
    }

    // Check if safe is already at max tier
    if (
      item.id === "safe_upgrade" &&
      user.safe_tier >= config.economy.safe.maxTier
    ) {
      throw new Error("Your safe is already at maximum tier!")
    }

    // Use EconomyService for the purchase
    const economyService = new EconomyService(this.client)

    if (item.category === "upgrades" && itemId === "safe_upgrade") {
      // For safe upgrades, use the dedicated upgrade method which handles its own transaction
      await economyService.upgradeSafe(userId)
    } else if (
      item.category === "boosts" &&
      itemId === "xp_boost" &&
      item.xpAmount
    ) {
      // For XP boosts, remove balance and add XP
      await economyService.removeBalance(
        userId,
        item.price,
        `Purchased ${item.name}`
      )
      const levelingService = new LevelingService(this.client)
      await levelingService.addXP(userId, item.xpAmount, "XP Boost item")
    } else {
      // For regular inventory items, handle the purchase and inventory update
      await this.client.database.transaction(async () => {
        // Remove balance using the database directly since we're in a transaction
        const currentUser = await this.client.database.getUser(userId)

        // Check balance again within transaction
        if (currentUser.balance < item.price) {
          throw new Error(`Insufficient balance`)
        }

        // Update balance
        await this.client.database.updateUser(userId, {
          balance: currentUser.balance - item.price,
        })

        // Log transaction
        await this.client.database.logTransaction(
          userId,
          "remove",
          item.price,
          `Purchased ${item.name}`
        )

        // Add to inventory
        const existingItem =
          await this.client.database.get<InventoryItemRecord>(
            "SELECT quantity FROM inventory WHERE user_id = ? AND item_id = ?",
            [userId, itemId]
          )

        if (existingItem && item.stackable) {
          await this.client.database.run(
            "UPDATE inventory SET quantity = quantity + 1 WHERE user_id = ? AND item_id = ?",
            [userId, itemId]
          )
        } else if (!existingItem) {
          await this.client.database.run(
            "INSERT INTO inventory (user_id, item_id, quantity) VALUES (?, ?, 1)",
            [userId, itemId]
          )
        } else {
          throw new Error("You already own this item and it cannot be stacked.")
        }
      })
    }

    return { success: true, item }
  }

  async getUserInventory(userId: string): Promise<UserInventoryItem[]> {
    const inventoryRecords =
      await this.client.database.all<InventoryItemRecord>(
        "SELECT item_id, quantity, purchased_at FROM inventory WHERE user_id = ?",
        [userId]
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
    const maxTier = config.economy.safe.maxTier || Number.POSITIVE_INFINITY
    const canUpgrade = currentTier < maxTier

    const nextUpgradeCost = canUpgrade
      ? Math.floor(
          config.economy.safe.baseCost *
            Math.pow(config.economy.safe.upgradeMultiplier, currentTier - 1)
        )
      : 0

    return {
      safe: {
        tier: currentTier,
        capacity: user.safe_capacity,
        nextUpgradeCost,
        maxTier: maxTier === Number.POSITIVE_INFINITY ? 999 : maxTier,
        canUpgrade,
      },
    }
  }
}

export type { ShopItem as ShopItemType }
