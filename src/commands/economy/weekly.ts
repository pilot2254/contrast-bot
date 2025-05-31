import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js"
import { EconomyService } from "../../services/EconomyService"
import { CustomEmbedBuilder } from "../../utils/EmbedBuilder"
import { config } from "../../config/bot.config"
import type { ExtendedClient } from "../../structures/ExtendedClient"
import type { Command } from "../../types/Command"

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("weekly")
    .setDescription("Claim your weekly reward or check its status")
    .addSubcommand((subcommand) => subcommand.setName("claim").setDescription("Claim your weekly reward"))
    .addSubcommand((subcommand) =>
      subcommand.setName("status").setDescription("Check the status of your weekly reward"),
    ),
  category: "economy",
  cooldown: 3,
  async execute(interaction: ChatInputCommandInteraction, client: ExtendedClient) {
    const subcommand = interaction.options.getSubcommand()
    const economyService = new EconomyService(client)

    switch (subcommand) {
      case "claim":
        await handleWeeklyClaim(interaction, client, economyService)
        break
      case "status":
        await handleWeeklyStatus(interaction, client, economyService)
        break
    }
  },
}

// Handle weekly claim subcommand
async function handleWeeklyClaim(
  interaction: ChatInputCommandInteraction,
  client: ExtendedClient,
  economyService: EconomyService,
) {
  try {
    const { amount } = await economyService.claimWeekly(interaction.user.id)

    const embed = CustomEmbedBuilder.success()
      .setTitle("Weekly Reward Claimed")
      .setDescription(`You claimed ${amount.toLocaleString()} ${config.economy.currency.symbol} as your weekly reward!`)
      .addFields({
        name: "✨ XP Gained",
        value: `+${config.economy.weekly.xpReward} XP`,
        inline: true,
      })

    await interaction.reply({ embeds: [embed] })
  } catch (error: unknown) {
    const errorEmbed = client.errorHandler.createUserError((error as Error).message)
    await interaction.reply({ embeds: [errorEmbed], ephemeral: true })
  }
}

// Handle weekly status subcommand
async function handleWeeklyStatus(
  interaction: ChatInputCommandInteraction,
  client: ExtendedClient,
  economyService: EconomyService,
) {
  try {
    const status = await economyService.getWeeklyStatus(interaction.user.id)

    if (!status.claimed) {
      const embed = CustomEmbedBuilder.info()
        .setTitle("Weekly Reward Status")
        .setDescription("Your weekly reward is available to claim!")
        .addFields({
          name: "💰 Reward Amount",
          value: `${config.economy.weekly.amount.toLocaleString()} ${config.economy.currency.symbol}`,
          inline: true,
        })

      await interaction.reply({ embeds: [embed] })
      return
    }

    // Calculate time remaining
    const timeLeft = status.timeLeft
    const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24))
    const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60))

    const embed = CustomEmbedBuilder.info()
      .setTitle("Weekly Reward Status")
      .setDescription("You've already claimed your weekly reward.")
      .addFields({
        name: "⏱️ Time Until Next Claim",
        value: `${days}d ${hours}h ${minutes}m`,
        inline: true,
      })

    await interaction.reply({ embeds: [embed] })
  } catch (error: unknown) {
    const errorEmbed = client.errorHandler.createUserError(
      (error as Error).message || "An error occurred while checking your weekly reward status.",
    )
    await interaction.reply({ embeds: [errorEmbed], ephemeral: true })
  }
}

export default command
