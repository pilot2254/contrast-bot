import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js"
import { EconomyService } from "../../services/EconomyService"
import { CustomEmbedBuilder } from "../../utils/EmbedBuilder"
import { config } from "../../config/bot.config"
import type { ExtendedClient } from "../../structures/ExtendedClient"
import type { Command } from "../../types/Command"

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("monthly")
    .setDescription("Claim your monthly reward or check its status")
    .addSubcommand((subcommand) => subcommand.setName("claim").setDescription("Claim your monthly reward"))
    .addSubcommand((subcommand) =>
      subcommand.setName("status").setDescription("Check the status of your monthly reward"),
    ),
  category: "economy",
  cooldown: 3,
  async execute(interaction: ChatInputCommandInteraction, client: ExtendedClient) {
    const subcommand = interaction.options.getSubcommand()
    const economyService = new EconomyService(client)

    switch (subcommand) {
      case "claim":
        await handleMonthlyClaim(interaction, client, economyService)
        break
      case "status":
        await handleMonthlyStatus(interaction, client, economyService)
        break
    }
  },
}

// Handle monthly claim subcommand
async function handleMonthlyClaim(
  interaction: ChatInputCommandInteraction,
  client: ExtendedClient,
  economyService: EconomyService,
) {
  try {
    const { amount } = await economyService.claimMonthly(interaction.user.id)

    const embed = CustomEmbedBuilder.success()
      .setTitle("Monthly Reward Claimed")
      .setDescription(
        `You claimed ${amount.toLocaleString()} ${config.economy.currency.symbol} as your monthly reward!`,
      )
      .addFields({
        name: "✨ XP Gained",
        value: `+${config.economy.monthly.xpReward} XP`,
        inline: true,
      })

    await interaction.reply({ embeds: [embed] })
  } catch (error: unknown) {
    const errorEmbed = client.errorHandler.createUserError((error as any).message)
    await interaction.reply({ embeds: [errorEmbed], ephemeral: true })
  }
}

// Handle monthly status subcommand
async function handleMonthlyStatus(
  interaction: ChatInputCommandInteraction,
  client: ExtendedClient,
  economyService: EconomyService,
) {
  try {
    const status = await economyService.getMonthlyStatus(interaction.user.id)

    if (!status.claimed) {
      const embed = CustomEmbedBuilder.info()
        .setTitle("Monthly Reward Status")
        .setDescription("Your monthly reward is available to claim!")
        .addFields({
          name: "💰 Reward Amount",
          value: `${config.economy.monthly.amount.toLocaleString()} ${config.economy.currency.symbol}`,
          inline: true,
        })

      await interaction.reply({ embeds: [embed] })
      return
    }

    // Calculate time remaining
    const timeLeft = status.timeLeft
    const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24))
    const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

    const embed = CustomEmbedBuilder.info()
      .setTitle("Monthly Reward Status")
      .setDescription("You've already claimed your monthly reward.")
      .addFields({
        name: "⏱️ Time Until Next Claim",
        value: `${days} days and ${hours} hours`,
        inline: true,
      })

    await interaction.reply({ embeds: [embed] })
  } catch (error: unknown) {
    const errorEmbed = client.errorHandler.createUserError(
      (error as any).message || "An error occurred while checking your monthly reward status.",
    )
    await interaction.reply({ embeds: [errorEmbed], ephemeral: true })
  }
}

export default command
