import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js"
import { GamblingService } from "../../services/GamblingService"
import { CustomEmbedBuilder } from "../../utils/EmbedBuilder"
import { config } from "../../config/bot.config"
import type { ExtendedClient } from "../../structures/ExtendedClient"
import type { Command } from "../../types/Command"

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("coinflip")
    .setDescription("Flip a coin and bet on the outcome")
    .addStringOption((option) =>
      option
        .setName("selection")
        .setDescription("Your choice")
        .setRequired(true)
        .addChoices(
          { name: "Heads", value: "heads" },
          { name: "Tails", value: "tails" }
        )
    )
    .addIntegerOption((option) =>
      option
        .setName("bet")
        .setDescription("Amount to bet")
        .setRequired(true)
        .setMinValue(config.gambling.minBet)
    )
    .addIntegerOption((option) =>
      option
        .setName("repeats")
        .setDescription("Number of times to play (max 10)")
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(10)
    ),
  category: "gambling",
  cooldown: 3,
  async execute(
    interaction: ChatInputCommandInteraction,
    client: ExtendedClient
  ) {
    const selection = interaction.options.getString("selection")! as
      | "heads"
      | "tails"
    const bet = interaction.options.getInteger("bet")!
    const repeats = interaction.options.getInteger("repeats") || 1
    const gamblingService = new GamblingService(client)

    // Defer reply for multiple plays
    if (repeats > 1) {
      await interaction.deferReply()
    }

    try {
      let totalWinnings = 0
      let totalLost = 0
      let wins = 0
      const results: string[] = []

      // Play multiple times
      for (let i = 0; i < repeats; i++) {
        const result = await gamblingService.playCoinflip(
          interaction.user.id,
          bet,
          selection
        )

        if (result.isWin) {
          totalWinnings += result.winnings
          wins++
        } else {
          totalLost += bet
        }

        // Format result for display
        const emoji = result.result === "heads" ? "👑" : "🪙"
        results.push(
          `**${i + 1}.** ${emoji} ${result.result.charAt(0).toUpperCase() + result.result.slice(1)} - ${
            result.isWin
              ? `Won ${result.winnings.toLocaleString()} ${config.economy.currency.symbol}`
              : `Lost ${bet.toLocaleString()} ${config.economy.currency.symbol}`
          }`
        )
      }

      // Create embed
      const embed = CustomEmbedBuilder.gambling()
        .setTitle("🪙 Coinflip")
        .setDescription(results.join("\n"))
        .addFields(
          {
            name: "🎯 Your Choice",
            value: selection.charAt(0).toUpperCase() + selection.slice(1),
            inline: true,
          },
          {
            name: "📊 Summary",
            value: `Played: ${repeats} time${repeats !== 1 ? "s" : ""}\nWon: ${wins}/${repeats}`,
            inline: true,
          },
          {
            name: "💰 Net Result",
            value: `${(totalWinnings - totalLost).toLocaleString()} ${config.economy.currency.symbol}`,
            inline: true,
          }
        )

      if (totalWinnings > totalLost) {
        embed.setColor(config.embeds.colors.success)
      } else if (totalWinnings < totalLost) {
        embed.setColor(config.embeds.colors.error)
      }

      if (repeats > 1) {
        await interaction.editReply({ embeds: [embed] })
      } else {
        await interaction.reply({ embeds: [embed] })
      }
    } catch (error: unknown) {
      const errorEmbed = client.errorHandler.createUserError(
        (error as any).message
      )
      if (interaction.deferred) {
        await interaction.editReply({ embeds: [errorEmbed] })
      } else {
        await interaction.reply({ embeds: [errorEmbed], ephemeral: true })
      }
    }
  },
}

export default command
