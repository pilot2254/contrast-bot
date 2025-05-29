import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js"
import { GamblingService } from "../../services/GamblingService"
import { CustomEmbedBuilder } from "../../utils/EmbedBuilder"
import { config } from "../../config/bot.config"
import type { ExtendedClient } from "../../structures/ExtendedClient"
import type { Command } from "../../types/Command"

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("number-guess")
    .setDescription("Guess a number within a range")
    .addIntegerOption((option) =>
      option.setName("number").setDescription("Your guess").setRequired(true).setMinValue(1),
    )
    .addIntegerOption((option) =>
      option
        .setName("range")
        .setDescription("Range of numbers (e.g., 10 means 1-10)")
        .setRequired(true)
        .setMinValue(2)
        .setMaxValue(100),
    )
    .addIntegerOption((option) =>
      option.setName("bet").setDescription("Amount to bet").setRequired(true).setMinValue(config.gambling.minBet),
    )
    .addIntegerOption((option) =>
      option
        .setName("repeats")
        .setDescription("Number of times to play (max 10)")
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(10),
    ),
  category: "gambling",
  cooldown: 3,
  async execute(interaction: ChatInputCommandInteraction, client: ExtendedClient) {
    const guess = interaction.options.getInteger("number")!
    const range = interaction.options.getInteger("range")!
    const bet = interaction.options.getInteger("bet")!
    const repeats = interaction.options.getInteger("repeats") || 1
    const gamblingService = new GamblingService(client)

    // Validate guess is within range
    if (guess > range) {
      const errorEmbed = client.errorHandler.createUserError(`Your guess must be between 1 and ${range}`)
      await interaction.reply({ embeds: [errorEmbed], ephemeral: true })
      return
    }

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
        const result = await gamblingService.playNumberGuess(interaction.user.id, bet, guess, range)

        if (result.isWin) {
          totalWinnings += result.winnings
          wins++
        } else {
          totalLost += bet
        }

        // Format result for display
        results.push(
          `**${i + 1}.** Number was ${result.result} - ${
            result.isWin
              ? `Won ${result.winnings.toLocaleString()} ${config.economy.currency.symbol}`
              : `Lost ${bet.toLocaleString()} ${config.economy.currency.symbol}`
          }`,
        )
      }

      // Calculate multiplier for this range
      const multiplier =
        config.gambling.games.numberGuess.baseMultiplier +
        (range - 2) * config.gambling.games.numberGuess.difficultyBonus

      // Create embed
      const embed = CustomEmbedBuilder.gambling()
        .setTitle("🔢 Number Guess")
        .setDescription(results.join("\n"))
        .addFields(
          {
            name: "🎯 Your Guess",
            value: guess.toString(),
            inline: true,
          },
          {
            name: "📏 Range",
            value: `1-${range}`,
            inline: true,
          },
          {
            name: "✖️ Multiplier",
            value: `${multiplier.toFixed(1)}x`,
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
          },
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
    } catch (error: any) {
      const errorEmbed = client.errorHandler.createUserError(error.message)
      if (interaction.deferred) {
        await interaction.editReply({ embeds: [errorEmbed] })
      } else {
        await interaction.reply({ embeds: [errorEmbed], ephemeral: true })
      }
    }
  },
}

export default command
