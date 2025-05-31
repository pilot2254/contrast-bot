import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js"
import { EconomyService } from "../../services/EconomyService"
import { CustomEmbedBuilder } from "../../utils/EmbedBuilder"
import { config } from "../../config/bot.config"
import type { ExtendedClient } from "../../structures/ExtendedClient"
import type { Command } from "../../types/Command"

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("safe")
    .setDescription("Manage your safe")
    .addSubcommand((subcommand) => subcommand.setName("check").setDescription("Check your safe balance and capacity"))
    .addSubcommand((subcommand) =>
      subcommand
        .setName("deposit")
        .setDescription("Deposit coins into your safe")
        .addIntegerOption((option) =>
          option.setName("amount").setDescription("The amount to deposit").setRequired(true).setMinValue(1),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("withdraw")
        .setDescription("Withdraw coins from your safe")
        .addIntegerOption((option) =>
          option.setName("amount").setDescription("The amount to withdraw").setRequired(true).setMinValue(1),
        ),
    ),
  category: "economy",
  cooldown: 3,
  async execute(interaction: ChatInputCommandInteraction, client: ExtendedClient) {
    const subcommand = interaction.options.getSubcommand()
    const economyService = new EconomyService(client)

    switch (subcommand) {
      case "check":
        await handleSafeCheck(interaction, client, economyService)
        break
      case "deposit":
        await handleSafeDeposit(interaction, client, economyService)
        break
      case "withdraw":
        await handleSafeWithdraw(interaction, client, economyService)
        break
    }
  },
}

// Handle safe check subcommand
async function handleSafeCheck(
  interaction: ChatInputCommandInteraction,
  client: ExtendedClient,
  economyService: EconomyService,
) {
  const { wallet, safe, safeCapacity } = await economyService.getBalance(interaction.user.id)
  const user = await client.database.getUser(interaction.user.id)

  // Calculate next upgrade cost
  const nextUpgradeCost = Math.floor(
    config.economy.safe.baseCost * Math.pow(config.economy.safe.upgradeMultiplier, user.safe_tier - 1),
  )

  const embed = CustomEmbedBuilder.economy()
    .setTitle("🔒 Your Safe")
    .setThumbnail(interaction.user.displayAvatarURL())
    .addFields(
      {
        name: "Safe Balance",
        value: `${safe.toLocaleString()} ${config.economy.currency.symbol}`,
        inline: true,
      },
      {
        name: "Safe Capacity",
        value: `${safeCapacity.toLocaleString()} ${config.economy.currency.symbol}`,
        inline: true,
      },
      {
        name: "Safe Tier",
        value: `Tier ${user.safe_tier}`,
        inline: true,
      },
      {
        name: "Wallet Balance",
        value: `${wallet.toLocaleString()} ${config.economy.currency.symbol}`,
        inline: true,
      },
      {
        name: "Next Upgrade Cost",
        value: `${nextUpgradeCost.toLocaleString()} ${config.economy.currency.symbol}`,
        inline: true,
      },
      {
        name: "Available Space",
        value: `${(safeCapacity - safe).toLocaleString()} ${config.economy.currency.symbol}`,
        inline: true,
      },
    )
    .setFooter({ text: "Upgrade your safe in the shop to increase capacity" })

  await interaction.reply({ embeds: [embed] })
}

// Handle safe deposit subcommand
async function handleSafeDeposit(
  interaction: ChatInputCommandInteraction,
  client: ExtendedClient,
  economyService: EconomyService,
) {
  const amount = interaction.options.getInteger("amount")!

  try {
    const { wallet, safe } = await economyService.depositToSafe(interaction.user.id, amount)

    const embed = CustomEmbedBuilder.success()
      .setTitle("Deposit Successful")
      .setDescription(`You deposited ${amount.toLocaleString()} ${config.economy.currency.symbol} into your safe.`)
      .addFields(
        {
          name: "💰 Wallet Balance",
          value: `${wallet.toLocaleString()} ${config.economy.currency.symbol}`,
          inline: true,
        },
        {
          name: "🔒 Safe Balance",
          value: `${safe.toLocaleString()} ${config.economy.currency.symbol}`,
          inline: true,
        },
      )

    await interaction.reply({ embeds: [embed] })
  } catch (error: unknown) {
    const errorEmbed = client.errorHandler.createUserError((error as any).message)
    await interaction.reply({ embeds: [errorEmbed], ephemeral: true })
  }
}

// Handle safe withdraw subcommand
async function handleSafeWithdraw(
  interaction: ChatInputCommandInteraction,
  client: ExtendedClient,
  economyService: EconomyService,
) {
  const amount = interaction.options.getInteger("amount")!

  try {
    const { wallet, safe } = await economyService.withdrawFromSafe(interaction.user.id, amount)

    const embed = CustomEmbedBuilder.success()
      .setTitle("Withdrawal Successful")
      .setDescription(`You withdrew ${amount.toLocaleString()} ${config.economy.currency.symbol} from your safe.`)
      .addFields(
        {
          name: "💰 Wallet Balance",
          value: `${wallet.toLocaleString()} ${config.economy.currency.symbol}`,
          inline: true,
        },
        {
          name: "🔒 Safe Balance",
          value: `${safe.toLocaleString()} ${config.economy.currency.symbol}`,
          inline: true,
        },
      )

    await interaction.reply({ embeds: [embed] })
  } catch (error: unknown) {
    const errorEmbed = client.errorHandler.createUserError((error as any).message)
    await interaction.reply({ embeds: [errorEmbed], ephemeral: true })
  }
}

export default command
