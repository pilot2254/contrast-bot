import { SlashCommandBuilder, type ChatInputCommandInteraction, EmbedBuilder } from "discord.js"
import {
  getOrCreateUserEconomy,
  transferCurrency,
  getTransactionHistory,
  getEconomyLeaderboard,
} from "../../utils/economy-manager"
import { botInfo } from "../../utils/bot-info"

// Slash command definition
export const data = new SlashCommandBuilder()
  .setName("balance")
  .setDescription("Manage your economy balance")
  .addSubcommand((subcommand) =>
    subcommand
      .setName("check")
      .setDescription("Check your current balance")
      .addUserOption((option) =>
        option.setName("user").setDescription("Check another user's balance").setRequired(false),
      ),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("transfer")
      .setDescription("Transfer coins to another user")
      .addUserOption((option) => option.setName("user").setDescription("User to transfer coins to").setRequired(true))
      .addIntegerOption((option) =>
        option.setName("amount").setDescription("Amount of coins to transfer").setRequired(true).setMinValue(1),
      ),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("history")
      .setDescription("View your transaction history")
      .addIntegerOption((option) =>
        option
          .setName("limit")
          .setDescription("Number of transactions to show (1-20)")
          .setRequired(false)
          .setMinValue(1)
          .setMaxValue(20),
      ),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("leaderboard")
      .setDescription("View the economy leaderboard")
      .addStringOption((option) =>
        option
          .setName("type")
          .setDescription("Type of leaderboard")
          .setRequired(false)
          .addChoices(
            { name: "Current Balance", value: "balance" },
            { name: "Total Earned", value: "earned" },
            { name: "Total Spent", value: "spent" },
          ),
      )
      .addIntegerOption((option) =>
        option
          .setName("limit")
          .setDescription("Number of users to show (1-20)")
          .setRequired(false)
          .setMinValue(1)
          .setMaxValue(20),
      ),
  )

// Slash command execution
export async function execute(interaction: ChatInputCommandInteraction) {
  const subcommand = interaction.options.getSubcommand()

  try {
    switch (subcommand) {
      case "check": {
        const targetUser = interaction.options.getUser("user") || interaction.user
        const economy = await getOrCreateUserEconomy(targetUser.id, targetUser.username)

        const embed = new EmbedBuilder()
          .setTitle(`💰 ${targetUser.username}'s Balance`)
          .setColor(botInfo.colors.primary)
          .setThumbnail(targetUser.displayAvatarURL())
          .addFields(
            { name: "💵 Current Balance", value: `${economy.balance.toLocaleString()} coins`, inline: true },
            { name: "📈 Total Earned", value: `${economy.totalEarned.toLocaleString()} coins`, inline: true },
            { name: "📉 Total Spent", value: `${economy.totalSpent.toLocaleString()} coins`, inline: true },
            { name: "🔥 Daily Streak", value: `${economy.dailyStreak} days`, inline: true },
            {
              name: "💎 Net Worth",
              value: `${(economy.totalEarned - economy.totalSpent).toLocaleString()} coins`,
              inline: true,
            },
            {
              name: "📊 Profit/Loss",
              value: `${(economy.balance - (economy.totalEarned - economy.totalSpent)).toLocaleString()} coins`,
              inline: true,
            },
          )
          .setFooter({ text: `Account created` })
          .setTimestamp(economy.createdAt)

        await interaction.reply({ embeds: [embed] })
        break
      }

      case "transfer": {
        const targetUser = interaction.options.getUser("user", true)
        const amount = interaction.options.getInteger("amount", true)

        if (targetUser.bot) {
          return interaction.reply({ content: "❌ You cannot transfer coins to bots!", ephemeral: true })
        }

        const result = await transferCurrency(
          interaction.user.id,
          interaction.user.username,
          targetUser.id,
          targetUser.username,
          amount,
        )

        if (!result.success) {
          return interaction.reply({ content: `❌ ${result.message}`, ephemeral: true })
        }

        const embed = new EmbedBuilder()
          .setTitle("💸 Transfer Successful")
          .setDescription(result.message)
          .setColor(botInfo.colors.success)
          .addFields(
            { name: "From", value: interaction.user.username, inline: true },
            { name: "To", value: targetUser.username, inline: true },
            { name: "Amount", value: `${amount.toLocaleString()} coins`, inline: true },
          )
          .setTimestamp()

        await interaction.reply({ embeds: [embed] })
        break
      }

      case "history": {
        const limit = interaction.options.getInteger("limit") || 10
        const transactions = await getTransactionHistory(interaction.user.id, limit)

        if (transactions.length === 0) {
          return interaction.reply({ content: "📝 You have no transaction history yet!", ephemeral: true })
        }

        const embed = new EmbedBuilder()
          .setTitle(`📋 Transaction History`)
          .setDescription(`Last ${transactions.length} transactions`)
          .setColor(botInfo.colors.primary)
          .setFooter({ text: `Requested by ${interaction.user.username}` })
          .setTimestamp()

        transactions.forEach((transaction, index) => {
          const date = new Date(transaction.timestamp).toLocaleDateString()
          const amount = transaction.amount > 0 ? `+${transaction.amount}` : transaction.amount.toString()
          const emoji = transaction.amount > 0 ? "📈" : "📉"

          embed.addFields({
            name: `${emoji} ${transaction.description}`,
            value: `${amount.toLocaleString()} coins • ${date}`,
            inline: false,
          })
        })

        await interaction.reply({ embeds: [embed], ephemeral: true })
        break
      }

      case "leaderboard": {
        const type = (interaction.options.getString("type") as "balance" | "earned" | "spent") || "balance"
        const limit = interaction.options.getInteger("limit") || 10
        const leaderboard = await getEconomyLeaderboard(type, limit)

        if (leaderboard.length === 0) {
          return interaction.reply({ content: "📊 No leaderboard data available yet!", ephemeral: true })
        }

        const typeNames = {
          balance: "Current Balance",
          earned: "Total Earned",
          spent: "Total Spent",
        }

        const embed = new EmbedBuilder()
          .setTitle(`🏆 Economy Leaderboard - ${typeNames[type]}`)
          .setColor(botInfo.colors.primary)
          .setTimestamp()

        const description = leaderboard
          .map((entry, index) => {
            const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `${index + 1}.`
            return `${medal} **${entry.username}** - ${entry.value.toLocaleString()} coins`
          })
          .join("\n")

        embed.setDescription(description)
        embed.setFooter({ text: `Showing top ${leaderboard.length} users` })

        await interaction.reply({ embeds: [embed] })
        break
      }
    }
  } catch (error) {
    await interaction.reply({
      content: "❌ An error occurred while processing your request.",
      ephemeral: true,
    })
  }
}