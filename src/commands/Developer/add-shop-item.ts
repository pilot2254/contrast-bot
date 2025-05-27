import type { Message } from "discord.js"
import { getDb } from "../../utils/database"
import { config } from "../../utils/config"

// Prefix command definition
export const name = "add-shop-item"
export const aliases = ["additem", "shop-add"]
export const description = "Add a new item to the shop"
export const usage = "<name> <description> <category> <base_price> <max_level> <price_multiplier> <effect_value>"
export const category = "Developer"

// Prefix command execution
export async function run(message: Message, args: string[]) {
  if (args.length < 7) {
    return message.reply(`Usage: \`${name} ${usage}\`\n\nCategories: safe, xp, transfer`)
  }

  const [itemName, description, category, basePriceStr, maxLevelStr, multiplierStr, effectValueStr] = args
  const basePrice = Number.parseInt(basePriceStr)
  const maxLevel = Number.parseInt(maxLevelStr)
  const priceMultiplier = Number.parseFloat(multiplierStr)
  const effectValue = Number.parseInt(effectValueStr)

  // Validate inputs
  if (isNaN(basePrice) || isNaN(maxLevel) || isNaN(priceMultiplier) || isNaN(effectValue)) {
    return message.reply("❌ Invalid numeric values provided.")
  }

  if (!["safe", "xp", "transfer"].includes(category)) {
    return message.reply("❌ Invalid category. Use: safe, xp, or transfer")
  }

  try {
    const db = getDb()
    const now = Date.now()

    await db.run(
      `INSERT INTO shop_items (name, description, category, base_price, max_level, price_multiplier, effect_value, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)`,
      itemName,
      description,
      category,
      basePrice,
      maxLevel,
      priceMultiplier,
      effectValue,
      now,
    )

    await message.reply(
      `✅ Successfully added **${itemName}** to the ${config.botName} shop!\n` +
        `Category: ${category}\n` +
        `Base Price: ${basePrice.toLocaleString()} coins\n` +
        `Max Level: ${maxLevel}\n` +
        `Price Multiplier: ${priceMultiplier}x\n` +
        `Effect Value: ${effectValue}`,
    )
  } catch (error) {
    await message.reply("❌ An error occurred while adding the shop item.")
  }
}
