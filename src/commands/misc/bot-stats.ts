import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js"
import { StatsManager } from "../../utils/StatsManager"
import { CustomEmbedBuilder } from "../../utils/EmbedBuilder"
import { config } from "../../config/bot.config"
import type { ExtendedClient } from "../../structures/ExtendedClient"
import type { Command } from "../../types/Command"

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("bot-stats")
    .setDescription("View bot statistics"),
  category: "misc",
  cooldown: 5,
  async execute(
    interaction: ChatInputCommandInteraction,
    client: ExtendedClient
  ) {
    const statsManager = new StatsManager(client)

    try {
      // Gather statistics
      const totalCommands = await statsManager.getTotalCommandsUsed()
      const topCommands = await statsManager.getTopCommands(1)
      const userCount = await statsManager.getUserCount()
      const economyStats = await statsManager.getEconomyStats()
      const uptime = statsManager.getBotUptime()

      const embed = CustomEmbedBuilder.info()
        .setTitle("📊 Bot Statistics")
        .setThumbnail(client.user?.displayAvatarURL() || "")
        .addFields(
          {
            name: "⚙️ General",
            value: `Servers: ${client.guilds.cache.size}\nUsers: ${userCount}\nUptime: ${uptime}`,
            inline: true,
          },
          {
            name: "📈 Commands",
            value: `Total Used: ${totalCommands.toLocaleString()}\nMost Popular: ${
              topCommands[0]?.command_name || "None"
            }`,
            inline: true,
          },
          {
            name: "💰 Economy",
            value: `Total Coins: ${economyStats.totalCoins.toLocaleString()}\nAverage Balance: ${Math.floor(
              economyStats.averageBalance
            ).toLocaleString()}`,
            inline: true,
          }
        )

      if (economyStats.richestUser.userId !== "none") {
        try {
          const richestUser = await client.users.fetch(
            economyStats.richestUser.userId
          )
          embed.addFields({
            name: "👑 Richest User",
            value: `${richestUser.username}: ${economyStats.richestUser.balance.toLocaleString()} ${config.economy.currency.symbol}`,
            inline: false,
          })
        } catch {
          // User not found
        }
      }

      await interaction.reply({ embeds: [embed] })
    } catch (error: unknown) {
      client.logger.error("Error in bot-stats command:", error)
      const errorEmbed = client.errorHandler.createUserError(
        "An error occurred while fetching bot statistics."
      )
      await interaction.reply({ embeds: [errorEmbed], ephemeral: true })
    }
  },
}

export default command
