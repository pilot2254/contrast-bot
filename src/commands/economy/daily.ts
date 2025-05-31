import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js"
import { EconomyService } from "../../services/EconomyService"
import { CustomEmbedBuilder } from "../../utils/EmbedBuilder"
import { config } from "../../config/bot.config"
import type { ExtendedClient } from "../../structures/ExtendedClient"
import type { Command } from "../../types/Command"

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("daily")
    .setDescription("Claim your daily reward or check its status")
    .addSubcommand((subcommand) =>
      subcommand.setName("claim").setDescription("Claim your daily reward")
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("status")
        .setDescription("Check the status of your daily reward")
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
      case "claim":
        await handleDailyClaim(interaction, client, economyService)
        break
      case "status":
        await handleDailyStatus(interaction, client, economyService)
        break
    }
  },
}

// Handle daily claim subcommand
async function handleDailyClaim(
  interaction: ChatInputCommandInteraction,
  client: ExtendedClient,
  economyService: EconomyService
) {
  try {
    const { amount, streak } = await economyService.claimDaily(
      interaction.user.id
    )

    const embed = CustomEmbedBuilder.success()
      .setTitle("Daily Reward Claimed")
      .setDescription(
        `You claimed ${amount.toLocaleString()} ${config.economy.currency.symbol} as your daily reward!`
      )
      .addFields(
        {
          name: "🔥 Current Streak",
          value: `${streak} day${streak !== 1 ? "s" : ""}`,
          inline: true,
        },
        {
          name: "✨ XP Gained",
          value: `+${config.economy.daily.xpReward} XP`,
          inline: true,
        }
      )

    if (config.economy.daily.streak.enabled && streak > 1) {
      const streakBonus = Math.min(
        streak * config.economy.daily.streak.multiplier,
        config.economy.daily.streak.maxMultiplier
      )
      embed.addFields({
        name: "🎁 Streak Bonus",
        value: `+${Math.round(streakBonus * 100)}%`,
        inline: true,
      })
    }

    await interaction.reply({ embeds: [embed] })
  } catch (error: unknown) {
    const errorEmbed = client.errorHandler.createUserError(
      (error as Error).message
    )
    await interaction.reply({ embeds: [errorEmbed], ephemeral: true })
  }
}

// Handle daily status subcommand
async function handleDailyStatus(
  interaction: ChatInputCommandInteraction,
  client: ExtendedClient,
  economyService: EconomyService
) {
  const status = await economyService.getDailyStatus(interaction.user.id)

  if (!status.claimed) {
    const embed = CustomEmbedBuilder.info()
      .setTitle("Daily Reward Status")
      .setDescription("Your daily reward is available to claim!")
      .addFields({
        name: "🔥 Current Streak",
        value: `${status.streak} day${status.streak !== 1 ? "s" : ""}`,
        inline: true,
      })

    if (config.economy.daily.streak.enabled && status.streak > 0) {
      const nextStreakBonus = Math.min(
        (status.streak + 1) * config.economy.daily.streak.multiplier,
        config.economy.daily.streak.maxMultiplier
      )
      embed.addFields({
        name: "🎁 Next Streak Bonus",
        value: `+${Math.round(nextStreakBonus * 100)}%`,
        inline: true,
      })
    }

    await interaction.reply({ embeds: [embed] })
  } else {
    // Calculate time remaining in hours, minutes, seconds
    const timeLeft = status.timeLeft
    const hours = Math.floor(timeLeft / (1000 * 60 * 60))
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000)

    const embed = CustomEmbedBuilder.info()
      .setTitle("Daily Reward Status")
      .setDescription("You've already claimed your daily reward.")
      .addFields(
        {
          name: "⏱️ Time Until Next Claim",
          value: `${hours}h ${minutes}m ${seconds}s`,
          inline: true,
        },
        {
          name: "🔥 Current Streak",
          value: `${status.streak} day${status.streak !== 1 ? "s" : ""}`,
          inline: true,
        }
      )

    await interaction.reply({ embeds: [embed] })
  }
}

export default command
