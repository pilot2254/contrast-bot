import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js"
import { EconomyService } from "../../services/EconomyService"
import { CustomEmbedBuilder } from "../../utils/EmbedBuilder"
import { config } from "../../config/bot.config"
import type { ExtendedClient } from "../../structures/ExtendedClient"
import type { Command } from "../../types/Command"

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("yearly")
    .setDescription("Claim your yearly reward or check its status")
    .addSubcommand((subcommand) => subcommand.setName("claim").setDescription("Claim your yearly reward"))
    .addSubcommand((subcommand) =>
      subcommand.setName("status").setDescription("Check the status of your yearly reward"),
    ),
  category: "economy",
  cooldown: 3,
  async execute(interaction: ChatInputCommandInteraction, client: ExtendedClient) {
    const subcommand = interaction.options.getSubcommand()
    const economyService = new EconomyService(client)

    switch (subcommand) {
      case "claim":
        await handleYearlyClaim(interaction, client, economyService)
        break
      case "status":
        await handleYearlyStatus(interaction, client, economyService)
        break
    }
  },
}

// Handle yearly claim subcommand
async function handleYearlyClaim(
  interaction: ChatInputCommandInteraction,
  client: ExtendedClient,
  economyService: EconomyService,
) {
  try {
    const { amount } = await economyService.claimYearly(interaction.user.id)

    const embed = CustomEmbedBuilder.success()
      .setTitle("🎉 Yearly Reward Claimed")
      .setDescription(`You claimed ${amount.toLocaleString()} ${config.economy.currency.symbol} as your yearly reward!`)
      .addFields({
        name: "✨ XP Gained",
        value: `+${config.economy.yearly.xpReward} XP`,
        inline: true,
      })

    await interaction.reply({ embeds: [embed] })
  } catch (error: any) {
    const errorEmbed = client.errorHandler.createUserError(error.message)
    await interaction.reply({ embeds: [errorEmbed], ephemeral: true })
  }
}

// Handle yearly status subcommand
async function handleYearlyStatus(
  interaction: ChatInputCommandInteraction,
  client: ExtendedClient,
  economyService: EconomyService,
) {
  try {
    const status = await economyService.getYearlyStatus(interaction.user.id)

    if (!status.claimed) {
      const embed = CustomEmbedBuilder.info()
        .setTitle("Yearly Reward Status")
        .setDescription("Your yearly reward is available to claim!")
        .addFields({
          name: "💰 Reward Amount",
          value: `${config.economy.yearly.amount.toLocaleString()} ${config.economy.currency.symbol}`,
          inline: true,
        })

      await interaction.reply({ embeds: [embed] })
      return
    }

    // Calculate time remaining
    const timeLeft = status.timeLeft
    const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24))

    const embed = CustomEmbedBuilder.info()
      .setTitle("Yearly Reward Status")
      .setDescription("You've already claimed your yearly reward.")
      .addFields({
        name: "⏱️ Time Until Next Claim",
        value: `${days} days`,
        inline: true,
      })

    await interaction.reply({ embeds: [embed] })
  } catch (error: any) {
    const errorEmbed = client.errorHandler.createUserError(
      error.message || "An error occurred while checking your yearly reward status.",
    )
    await interaction.reply({ embeds: [errorEmbed], ephemeral: true })
  }
}

export default command
