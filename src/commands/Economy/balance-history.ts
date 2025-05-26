import { SlashCommandBuilder, type ChatInputCommandInteraction, EmbedBuilder } from "discord.js"
import { getTransactionHistory } from "../../utils/economy-manager"
import { botInfo } from "../../utils/bot-info"
import { config } from "../../utils/config"

// Slash command definition
export const data = new SlashCommandBuilder()
  .setName("balance-history")
  .setDescription("View your detailed transaction history")
  .addIntegerOption((option) =>
    option
      .setName("limit")
      .setDescription("Number of transactions to show (1-50)")
      .setRequired(false)
      .setMinValue(1)
      .setMaxValue(50),
  )
  .addStringOption((option) =>
    option
      .setName("type")
      .setDescription("Filter by transaction type")
      .setRequired(false)
      .addChoices(
        { name: "All Transactions", value: "all" },
        { name: "Daily Rewards", value: "daily" },
        { name: "Transfers", value: "transfer" },
        { name: "Gambling", value: "gambling" },
        { name: "Shop Purchases", value: "shop" },
        { name: "Admin Actions", value: "admin" },
      ),
  )
  .addUserOption((option) =>
    option.setName("user").setDescription("View another user's history (admin only)").setRequired(false),
  )

// Slash command execution
export async function execute(interaction: ChatInputCommandInteraction) {
  const limit = interaction.options.getInteger("limit") || 20
  const filterType = interaction.options.getString("type") || "all"
  const targetUser = interaction.options.getUser("user")

  // Check if user is trying to view someone else's history
  if (targetUser && targetUser.id !== interaction.user.id) {
    // For now, only allow users to view their own history
    // You can add admin check here later if needed
    return interaction.reply({
      content: "❌ You can only view your own transaction history.",
      ephemeral: true,
    })
  }

  const userId = targetUser?.id || interaction.user.id
  const username = targetUser?.username || interaction.user.username

  try {
    // Get transaction history
    const allTransactions = await getTransactionHistory(userId, 100) // Get more to filter

    // Filter transactions based on type
    let filteredTransactions = allTransactions
    if (filterType !== "all") {
      filteredTransactions = allTransactions.filter((transaction) => {
        switch (filterType) {
          case "daily":
            return transaction.type === "daily"
          case "transfer":
            return transaction.type.includes("transfer")
          case "gambling":
            return transaction.type.includes("gambling")
          case "shop":
            return transaction.type.includes("shop")
          case "admin":
            return transaction.type.includes("admin")
          default:
            return true
        }
      })
    }

    // Limit the results
    const transactions = filteredTransactions.slice(0, limit)

    if (transactions.length === 0) {
      const filterText = filterType === "all" ? "" : ` for ${filterType} transactions`
      return interaction.reply({
        content: `📝 No transaction history found${filterText}!`,
        ephemeral: true,
      })
    }

    // Create embed
    const embed = new EmbedBuilder()
      .setTitle(`💳 Transaction History`)
      .setDescription(
        `${filterType === "all" ? "All" : filterType.charAt(0).toUpperCase() + filterType.slice(1)} transactions for ${username}`,
      )
      .setColor(botInfo.colors.primary)
      .setFooter({
        text: `${config.botName} • Showing ${transactions.length} of ${filteredTransactions.length} transactions`,
      })
      .setTimestamp()

    // Add transaction fields
    transactions.forEach((transaction, index) => {
      const date = new Date(transaction.timestamp).toLocaleDateString()
      const time = new Date(transaction.timestamp).toLocaleTimeString()
      const amount = transaction.amount > 0 ? `+${transaction.amount}` : transaction.amount.toString()
      const emoji = getTransactionEmoji(transaction.type, transaction.amount)

      embed.addFields({
        name: `${emoji} ${transaction.description}`,
        value: `**${amount.toLocaleString()} coins** • ${date} at ${time}`,
        inline: false,
      })
    })

    // Calculate totals for the filtered transactions
    const totalIn = transactions.filter((t) => t.amount > 0).reduce((sum, t) => sum + t.amount, 0)
    const totalOut = transactions.filter((t) => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0)
    const netChange = totalIn - totalOut

    embed.addFields({
      name: "📊 Summary",
      value: `**Income:** +${totalIn.toLocaleString()} coins\n**Expenses:** -${totalOut.toLocaleString()} coins\n**Net:** ${netChange >= 0 ? "+" : ""}${netChange.toLocaleString()} coins`,
      inline: false,
    })

    await interaction.reply({ embeds: [embed], ephemeral: true })
  } catch (error) {
    await interaction.reply({
      content: "❌ An error occurred while fetching your transaction history.",
      ephemeral: true,
    })
  }
}

// Helper function to get appropriate emoji for transaction type
function getTransactionEmoji(type: string, amount: number): string {
  if (amount > 0) {
    // Incoming money
    switch (type) {
      case "daily":
        return "🎁"
      case "gambling_win":
        return "🎰"
      case "transfer_received":
        return "📨"
      case "admin_add":
        return "👑"
      case "bonus":
        return "🎉"
      default:
        return "📈"
    }
  } else {
    // Outgoing money
    switch (type) {
      case "gambling_bet":
        return "🎲"
      case "gambling_loss":
        return "💸"
      case "transfer_sent":
        return "📤"
      case "shop_purchase":
        return "🛒"
      case "admin_remove":
        return "⚖️"
      default:
        return "📉"
    }
  }
}
