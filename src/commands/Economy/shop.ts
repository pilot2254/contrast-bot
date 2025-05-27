import { SlashCommandBuilder, type ChatInputCommandInteraction, EmbedBuilder } from "discord.js"
import { getAllShopItems, getUserPurchases, purchaseItem, getShopCategories } from "../../utils/shop-manager"
import { getOrCreateUserEconomy } from "../../utils/economy-manager"
import { botInfo } from "../../utils/bot-info"
import { config } from "../../utils/config"

export const data = new SlashCommandBuilder()
  .setName("shop")
  .setDescription("Browse and purchase items from the shop")
  .addSubcommand((subcommand) =>
    subcommand
      .setName("list")
      .setDescription("View available shop items")
      .addStringOption((option) => option.setName("category").setDescription("Filter by category").setRequired(false)),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("buy")
      .setDescription("Purchase an item from the shop (automatically upgrades to next level)")
      .addIntegerOption((option) =>
        option.setName("item_id").setDescription("ID of the item to purchase").setRequired(true).setMinValue(1),
      ),
  )
  .addSubcommand((subcommand) => subcommand.setName("inventory").setDescription("View your purchased items"))

export async function execute(interaction: ChatInputCommandInteraction) {
  const subcommand = interaction.options.getSubcommand()

  try {
    switch (subcommand) {
      case "list": {
        const category = interaction.options.getString("category")
        const items = await getAllShopItems(category || undefined)

        if (items.length === 0) {
          return interaction.reply({
            content: category ? `❌ No items found in category "${category}"` : "❌ No items available in the shop",
            ephemeral: true,
          })
        }

        const categories = await getShopCategories()
        const embed = new EmbedBuilder()
          .setTitle("🛒 Shop Items")
          .setColor(botInfo.colors.primary)
          .setDescription(
            category ? `Showing items in category: **${category}**` : `Available categories: ${categories.join(", ")}`,
          )

        // Group items by category
        const itemsByCategory: { [key: string]: any[] } = {}
        items.forEach((item) => {
          if (!itemsByCategory[item.category]) {
            itemsByCategory[item.category] = []
          }
          itemsByCategory[item.category].push(item)
        })

        for (const [cat, catItems] of Object.entries(itemsByCategory)) {
          const itemList = catItems
            .map((item) => {
              const price = item.basePrice.toLocaleString()
              return `**${item.id}.** ${item.name}\n${item.description}\n💰 Base Price: ${price} coins | Max Level: ${item.maxLevel}`
            })
            .join("\n\n")

          embed.addFields({
            name: `📦 ${cat.charAt(0).toUpperCase() + cat.slice(1)} Items`,
            value: itemList,
            inline: false,
          })
        }

        embed.setFooter({ text: `${config.botName} • Use /shop buy <item_id> to purchase/upgrade` })

        await interaction.reply({ embeds: [embed] })
        break
      }

      case "buy": {
        const itemId = interaction.options.getInteger("item_id", true)

        const result = await purchaseItem(interaction.user.id, interaction.user.username, itemId)

        if (!result.success) {
          return interaction.reply({ content: `❌ ${result.message}`, ephemeral: true })
        }

        const economy = await getOrCreateUserEconomy(interaction.user.id, interaction.user.username)

        const embed = new EmbedBuilder()
          .setTitle("✅ Purchase Successful!")
          .setDescription(result.message)
          .setColor(botInfo.colors.success)
          .addFields({ name: "💰 Remaining Balance", value: `${economy.balance.toLocaleString()} coins`, inline: true })
          .setFooter({ text: config.botName })
          .setTimestamp()

        await interaction.reply({ embeds: [embed] })
        break
      }

      case "inventory": {
        const purchases = await getUserPurchases(interaction.user.id)

        if (purchases.length === 0) {
          return interaction.reply({
            content: "📦 Your inventory is empty. Visit `/shop list` to browse available items!",
            ephemeral: true,
          })
        }

        const embed = new EmbedBuilder()
          .setTitle("📦 Your Inventory")
          .setColor(botInfo.colors.primary)
          .setThumbnail(interaction.user.displayAvatarURL())

        // Simple list without grouping by category since UserPurchase doesn't have category
        const itemList = purchases
          .map((purchase) => {
            const date = new Date(purchase.purchasedAt).toLocaleDateString()
            return `**${purchase.name}** (Level ${purchase.level})\n💰 Paid: ${purchase.pricePaid.toLocaleString()} coins | 📅 ${date}`
          })
          .join("\n\n")

        embed.setDescription(itemList)
        embed.setFooter({ text: `${config.botName} • Total items: ${purchases.length}` })

        await interaction.reply({ embeds: [embed] })
        break
      }
    }
  } catch (error) {
    await interaction.reply({
      content: "❌ An error occurred while processing your shop request.",
      ephemeral: true,
    })
  }
}
