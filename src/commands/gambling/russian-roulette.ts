import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js"
import { GamblingService } from "../../services/GamblingService"
import { CustomEmbedBuilder } from "../../utils/EmbedBuilder"
import { config } from "../../config/bot.config"
import type { ExtendedClient } from "../../structures/ExtendedClient"
import type { Command } from "../../types/Command"

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("russian-roulette")
    .setDescription("Risk it all in a game of Russian Roulette (all-in only)"),
  category: "gambling",
  cooldown: 5,
  async execute(interaction: ChatInputCommandInteraction, client: ExtendedClient) {
    const gamblingService = new GamblingService(client)

    try {
      // Play Russian Roulette
      const result = await gamblingService.playRussianRoulette(interaction.user.id)

      if (result.survived) {
        const embed = CustomEmbedBuilder.success()
          .setTitle("🔫 Russian Roulette - SURVIVED!")
          .setDescription("*Click*... The chamber was empty! You survived and won big!")
          .addFields({
            name: "💰 Winnings",
            value: `${result.winnings.toLocaleString()} ${config.economy.currency.symbol}`,
            inline: true,
          })
          .setFooter({ text: "Lucky you! Your wallet has been multiplied!" })

        await interaction.reply({ embeds: [embed] })
      } else {
        const embed = CustomEmbedBuilder.error()
          .setTitle("🔫 Russian Roulette - BANG!")
          .setDescription("*BANG!* The gun fired... You lost everything in your wallet!")
          .addFields({
            name: "💸 Lost",
            value: `All coins in wallet`,
            inline: true,
          })
          .setFooter({ text: "Better luck next time... Your safe balance is untouched." })

        await interaction.reply({ embeds: [embed] })
      }
    } catch (error: unknown) {
      const errorEmbed = client.errorHandler.createUserError((error as any).message)
      await interaction.reply({ embeds: [errorEmbed], ephemeral: true })
    }
  },
}

export default command
