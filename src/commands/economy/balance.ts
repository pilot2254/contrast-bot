import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js"
import { EconomyService } from "../../services/economy/EconomyService"
import { CustomEmbedBuilder } from "../../utils/EmbedBuilder"
import { config } from "../../config/config"
import type { ExtendedClient } from "../../structures/ExtendedClient"
import type { Command } from "../../types/Command"

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("balance")
    .setDescription("Check your balance or transfer coins to another user")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("check")
        .setDescription("Check your balance or another user's balance")
        .addUserOption((option) =>
          option
            .setName("user")
            .setDescription("The user to check")
            .setRequired(false)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("transfer")
        .setDescription("Transfer coins to another user")
        .addUserOption((option) =>
          option
            .setName("user")
            .setDescription("The user to transfer to")
            .setRequired(true)
        )
        .addIntegerOption((option) =>
          option
            .setName("amount")
            .setDescription("The amount to transfer")
            .setRequired(true)
            .setMinValue(1)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand.setName("leaderboard").setDescription("View the richest users")
    ),
  category: "economy",
  cooldown: 3,
  async execute(
    interaction: ChatInputCommandInteraction,
    client: ExtendedClient
  ) {
    const subcommand = interaction.options.getSubcommand()
    const economyService = new EconomyService(client)

    switch (subcommand) {
      case "check":
        await handleBalanceCheck(interaction, economyService)
        break
      case "transfer":
        await handleBalanceTransfer(interaction, client, economyService)
        break
      case "leaderboard":
        await handleBalanceLeaderboard(interaction, client)
        break
    }
  },
}

async function handleBalanceCheck(
  interaction: ChatInputCommandInteraction,
  economyService: EconomyService
) {
  const targetUser = interaction.options.getUser("user") || interaction.user
  const { wallet, safe, safeCapacity } = await economyService.getBalance(
    targetUser.id
  )

  const embed = CustomEmbedBuilder.economy()
    .setTitle(
      `${targetUser.id === interaction.user.id ? "Your" : `${targetUser.username}'s`} Balance`
    )
    .setThumbnail(targetUser.displayAvatarURL())
    .addFields(
      {
        name: "💰 Wallet",
        value: `${wallet.toLocaleString()} ${config.economy.currency.symbol}`,
        inline: true,
      },
      {
        name: "🔒 Safe",
        value: `${safe.toLocaleString()} / ${safeCapacity.toLocaleString()} ${config.economy.currency.symbol}`,
        inline: true,
      },
      {
        name: "💵 Total",
        value: `${(wallet + safe).toLocaleString()} ${config.economy.currency.symbol}`,
        inline: true,
      }
    )

  await interaction.reply({ embeds: [embed] })
}

async function handleBalanceTransfer(
  interaction: ChatInputCommandInteraction,
  client: ExtendedClient,
  economyService: EconomyService
) {
  const targetUser = interaction.options.getUser("user")!
  const amount = interaction.options.getInteger("amount")!

  if (targetUser.id === interaction.user.id) {
    const errorEmbed = client.errorHandler.createUserError(
      "You cannot transfer coins to yourself."
    )
    await interaction.reply({ embeds: [errorEmbed], ephemeral: true })
    return
  }

  if (targetUser.bot) {
    const errorEmbed = client.errorHandler.createUserError(
      "You cannot transfer coins to a bot."
    )
    await interaction.reply({ embeds: [errorEmbed], ephemeral: true })
    return
  }

  try {
    const { senderBalance } = await economyService.transferBalance(
      interaction.user.id,
      targetUser.id,
      amount
    )

    const embed = CustomEmbedBuilder.success()
      .setTitle("Transfer Successful")
      .setDescription(
        `You transferred ${amount.toLocaleString()} ${config.economy.currency.symbol} to ${targetUser.toString()}.`
      )
      .addFields({
        name: "💰 Your New Balance",
        value: `${senderBalance.toLocaleString()} ${config.economy.currency.symbol}`,
      })

    await interaction.reply({ embeds: [embed] })
  } catch (error: unknown) {
    const errorEmbed = client.errorHandler.createUserError(
      (error as Error).message
    )
    await interaction.reply({ embeds: [errorEmbed], ephemeral: true })
  }
}

async function handleBalanceLeaderboard(
  interaction: ChatInputCommandInteraction,
  client: ExtendedClient
) {
  const topUsers = await client.database.all(
    "SELECT user_id, balance + safe_balance as total FROM users ORDER BY total DESC LIMIT 10"
  )

  if (topUsers.length === 0) {
    const embed = CustomEmbedBuilder.info().setDescription(
      "No users found in the leaderboard yet."
    )
    await interaction.reply({ embeds: [embed] })
    return
  }

  const embed = CustomEmbedBuilder.economy()
    .setTitle("💰 Richest Users")
    .setDescription("The wealthiest users on the server")

  let description = ""
  for (let i = 0; i < topUsers.length; i++) {
    try {
      const userId = topUsers[i].user_id
      const total = topUsers[i].total

      let username
      try {
        const user = await client.users.fetch(userId)
        username = user.username
      } catch {
        username = `User ${userId}`
      }

      description += `**${i + 1}.** ${username}: ${total.toLocaleString()} ${config.economy.currency.symbol}\n`
    } catch (error) {
      client.logger.error(`Error fetching user for leaderboard: ${error}`)
    }
  }

  embed.setDescription(description)
  await interaction.reply({ embeds: [embed] })
}

export default command
