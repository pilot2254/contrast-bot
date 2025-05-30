import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js"
import { GamblingService } from "../../services/GamblingService"
import { CustomEmbedBuilder } from "../../utils/EmbedBuilder"
import { config } from "../../config/bot.config"
import type { ExtendedClient } from "../../structures/ExtendedClient"
import type { Command } from "../../types/Command"

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("dice-roll")
    .setDescription("Roll dice and guess the total")
    .addIntegerOption((option) =>
      option.setName("number").setDescription("Your guess for the total").setRequired(true).setMinValue(1),
    )
    .addIntegerOption((option) =>
      option.setName("bet").setDescription("Amount to bet").setRequired(true).setMinValue(config.gambling.minBet),
    )
    .addIntegerOption((option) =>
      option
        .setName("dices")
        .setDescription("Number of dice to roll (default: 1)")
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(5),
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
    const bet = interaction.options.getInteger("bet")!
    const diceCount = interaction.options.getInteger("dices") || 1
    const repeats = interaction.options.getInteger("repeats") || 1
    const gamblingService = new GamblingService(client)

    // Validate guess is within possible range
    if (guess < diceCount || guess > diceCount * 6) {
      const errorEmbed = client.errorHandler.createUserError(
        `Your guess must be between ${diceCount} and ${diceCount * 6}`,
      )
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
        const result = await gamblingService.playDiceRoll(interaction.user.id, bet, guess, diceCount)

        if (result.isWin) {
          totalWinnings += result.winnings
          wins++
        } else {
          totalLost += bet
        }

        // Format dice results
        const diceEmojis = result.results.map((die) => ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"][die - 1]).join(" ")

        results.push(
          `**${i + 1}.** ${diceEmojis} = ${result.total} - ${
            result.isWin
              ? `Won ${result.winnings.toLocaleString()} ${config.economy.currency.symbol}`
              : `Lost ${bet.toLocaleString()} ${config.economy.currency.symbol}`
          }`,
        )
      }

      // Create embed
      const embed = CustomEmbedBuilder.gambling()
        .setTitle("🎲 Dice Roll")
        .setDescription(results.join("\n"))
        .addFields(
          {
            name: "🎯 Your Guess",
            value: guess.toString(),
            inline: true,
          },
          {
            name: "🎲 Dice Count",
            value: diceCount.toString(),
            inline: true,
          },
          {
            name: "✖️ Multiplier",
            value: `${config.gambling.games.diceRoll.exactMatchMultiplier}x`,
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
    } catch (error: unknown) {
      const errorEmbed = client.errorHandler.createUserError((error as Error).message)
      if (interaction.deferred) {
        await interaction.editReply({ embeds: [errorEmbed] })
      } else {
        await interaction.reply({ embeds: [errorEmbed], ephemeral: true })
      }
    }
  },
}

export default command
