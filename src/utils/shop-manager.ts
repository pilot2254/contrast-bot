import { logger } from "./logger"
import { getDb } from "./database"
import { getOrCreateUserEconomy, TRANSACTION_TYPES } from "./economy-manager"

export interface ShopItem {
  id: number
  name: string
  description: string
  category: string
  basePrice: number
  maxLevel: number
  priceMultiplier: number
  effectValue: number
  isActive: boolean
  createdAt: number
}

export interface UserPurchase {
  id: number
  userId: string
  itemId: number
  level: number
  pricePaid: number
  purchasedAt: number
  name?: string
  description?: string
  category?: string
}

export async function initShopManager(): Promise<void> {
  try {
    logger.info("Shop manager initialized")
  } catch (error) {
    logger.error("Failed to initialize shop manager:", error)
  }
}

export async function getAllShopItems(category?: string): Promise<ShopItem[]> {
  try {
    const db = getDb()
    let query = "SELECT * FROM shop_items WHERE is_active = 1"
    const params: any[] = []

    if (category) {
      query += " AND category = ?"
      params.push(category)
    }

    query += " ORDER BY category, base_price"

    const items = await db.all(query, ...params)
    return items.map((item: any) => ({
      id: item.id,
      name: item.name,
      description: item.description,
      category: item.category,
      basePrice: item.base_price,
      maxLevel: item.max_level,
      priceMultiplier: item.price_multiplier,
      effectValue: item.effect_value,
      isActive: item.is_active === 1,
      createdAt: item.created_at,
    }))
  } catch (error) {
    logger.error("Failed to get shop items:", error)
    return []
  }
}

export async function getUserPurchases(userId: string): Promise<UserPurchase[]> {
  try {
    const db = getDb()
    const purchases = await db.all(
      `SELECT up.*, si.name, si.description, si.category 
       FROM user_purchases up
       JOIN shop_items si ON up.item_id = si.id
       WHERE up.user_id = ?
       ORDER BY up.purchased_at DESC`,
      userId,
    )

    return purchases.map((purchase: any) => ({
      id: purchase.id,
      userId: purchase.user_id,
      itemId: purchase.item_id,
      level: purchase.level,
      pricePaid: purchase.price_paid,
      purchasedAt: purchase.purchased_at,
      name: purchase.name,
      description: purchase.description,
      category: purchase.category,
    }))
  } catch (error) {
    logger.error(`Failed to get user purchases for ${userId}:`, error)
    return []
  }
}

export async function calculateItemPrice(itemId: number, level: number): Promise<number> {
  try {
    const db = getDb()
    const item = await db.get("SELECT * FROM shop_items WHERE id = ?", itemId)

    if (!item) {
      throw new Error("Item not found")
    }

    return Math.floor(item.base_price * Math.pow(item.price_multiplier, level - 1))
  } catch (error) {
    logger.error(`Failed to calculate price for item ${itemId} level ${level}:`, error)
    return 0
  }
}

export async function purchaseItem(
  userId: string,
  username: string,
  itemId: number,
): Promise<{ success: boolean; message: string }> {
  try {
    const db = getDb()

    await db.exec("BEGIN TRANSACTION")

    try {
      // Get item details
      const item = await db.get("SELECT * FROM shop_items WHERE id = ? AND is_active = 1", itemId)
      if (!item) {
        await db.exec("ROLLBACK")
        return { success: false, message: "Item not found or not available" }
      }

      // Check if user already owns this item
      const existingPurchase = await db.get(
        "SELECT * FROM user_purchases WHERE user_id = ? AND item_id = ?",
        userId,
        itemId,
      )

      let currentLevel = 0
      if (existingPurchase) {
        currentLevel = existingPurchase.level
      }

      // Auto-calculate next level
      const targetLevel = currentLevel + 1

      // Check if already at max level
      if (currentLevel >= item.max_level) {
        await db.exec("ROLLBACK")
        return { success: false, message: `You already own the maximum level (${item.max_level}) of this item` }
      }

      // Calculate cost for next level
      const cost = Math.floor(item.base_price * Math.pow(item.price_multiplier, targetLevel - 1))

      // Check if user has enough funds
      const economy = await getOrCreateUserEconomy(userId, username)
      if (economy.balance < cost) {
        await db.exec("ROLLBACK")
        return {
          success: false,
          message: `Insufficient funds. You need ${cost.toLocaleString()} coins but only have ${economy.balance.toLocaleString()} coins. Try using \`/work\` to earn more!`,
        }
      }

      // Remove currency from user
      await db.run(
        `UPDATE user_economy 
         SET balance = balance - ?, total_spent = total_spent + ?, updated_at = ?
         WHERE user_id = ?`,
        cost,
        cost,
        Date.now(),
        userId,
      )

      // Create transaction record
      await db.run(
        `INSERT INTO transactions (user_id, type, amount, description, timestamp)
         VALUES (?, ?, ?, ?, ?)`,
        userId,
        TRANSACTION_TYPES.SHOP_PURCHASE,
        -cost,
        `Purchased ${item.name} (Level ${targetLevel})`,
        Date.now(),
      )

      // Update or create purchase record
      if (existingPurchase) {
        await db.run(
          `UPDATE user_purchases 
           SET level = ?, price_paid = price_paid + ?, purchased_at = ?
           WHERE user_id = ? AND item_id = ?`,
          targetLevel,
          cost,
          Date.now(),
          userId,
          itemId,
        )
      } else {
        await db.run(
          `INSERT INTO user_purchases (user_id, item_id, level, price_paid, purchased_at)
           VALUES (?, ?, ?, ?, ?)`,
          userId,
          itemId,
          targetLevel,
          cost,
          Date.now(),
        )
      }

      // Apply item effects (without starting new transactions)
      await applyItemEffectInTransaction(db, userId, username, item, targetLevel, currentLevel)

      await db.exec("COMMIT")

      return {
        success: true,
        message: `Successfully upgraded ${item.name} to Level ${targetLevel} for ${cost.toLocaleString()} coins!`,
      }
    } catch (error) {
      await db.exec("ROLLBACK")
      throw error
    }
  } catch (error) {
    logger.error(`Failed to purchase item for ${userId}:`, error)
    return { success: false, message: "An error occurred during purchase" }
  }
}

async function applyItemEffectInTransaction(
  db: any,
  userId: string,
  username: string,
  item: any,
  newLevel: number,
  oldLevel: number,
): Promise<void> {
  try {
    const levelDifference = newLevel - oldLevel

    switch (item.category) {
      case "safe":
        // Safe expansion - increase capacity (without transaction since we're already in one)
        const capacityIncrease = item.effect_value * levelDifference
        await db.run(
          `UPDATE user_safes 
           SET capacity = capacity + ?, updated_at = ?
           WHERE user_id = ?`,
          capacityIncrease,
          Date.now(),
          userId,
        )
        break

      case "xp":
        // XP boost - award XP directly without starting new transaction
        const xpToAward = item.effect_value * levelDifference

        // Get or create user level record
        let userLevel = await db.get("SELECT * FROM user_levels WHERE user_id = ?", userId)
        if (!userLevel) {
          await db.run(
            `INSERT INTO user_levels 
             (user_id, username, xp, level, last_command_xp, total_commands_used, total_games_played, total_games_won, total_bet_amount, updated_at) 
             VALUES (?, ?, 0, 0, 0, 0, 0, 0, 0, ?)`,
            userId,
            username,
            Date.now(),
          )
          userLevel = { xp: 0, level: 0 }
        }

        // Add XP directly
        const newXp = userLevel.xp + xpToAward
        const newLevelCalc = calculateLevelFromXp(newXp)

        await db.run(
          `UPDATE user_levels 
           SET xp = ?, level = ?, updated_at = ? 
           WHERE user_id = ?`,
          newXp,
          newLevelCalc,
          Date.now(),
          userId,
        )

        // Record level up if applicable
        if (newLevelCalc > userLevel.level) {
          await db.run(
            `INSERT INTO level_history 
             (user_id, old_level, new_level, timestamp) 
             VALUES (?, ?, ?, ?)`,
            userId,
            userLevel.level,
            newLevelCalc,
            Date.now(),
          )
        }
        break

      case "transfer":
        // Transfer limit upgrade - currently cosmetic since transfers are unlimited
        logger.info(`User ${userId} purchased transfer limit upgrade (cosmetic effect)`)
        break

      default:
        logger.warn(`Unknown item category: ${item.category}`)
    }
  } catch (error) {
    logger.error(`Failed to apply item effect for ${userId}:`, error)
    throw error
  }
}

// Helper function for XP calculation
function calculateLevelFromXp(xp: number): number {
  const BASE_XP = 100
  const XP_MULTIPLIER = 1.5

  let level = 0
  let xpForNextLevel = BASE_XP
  let totalXpNeeded = 0

  while (xp >= totalXpNeeded + xpForNextLevel) {
    level++
    totalXpNeeded += xpForNextLevel
    xpForNextLevel = Math.floor(BASE_XP * Math.pow(XP_MULTIPLIER, level))
  }

  return level
}

export async function getShopCategories(): Promise<string[]> {
  try {
    const db = getDb()
    const categories = await db.all("SELECT DISTINCT category FROM shop_items WHERE is_active = 1 ORDER BY category")
    return categories.map((cat: any) => cat.category)
  } catch (error) {
    logger.error("Failed to get shop categories:", error)
    return []
  }
}
