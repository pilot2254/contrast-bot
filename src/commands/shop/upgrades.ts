import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js"
import { ShopService } from "../../services/ShopService"
import { CustomEmbedBuilder } from "../../utils/EmbedBuilder"
import { config } from "../../config/bot.config"
import type { ExtendedClient } from "../../structures/ExtendedClient"
import type { Command } from "../../types/Command"

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("upgrades")
    .setDescription("View your current upgrades and available upgrade options")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("View another user's upgrades")
        .setRequired(false)
    ),
  category: "economy",
  cooldown: 3,
  async execute(
    interaction: ChatInputCommandInteraction,
    client: ExtendedClient
  ) {
    const targetUser = interaction.options.getUser("user") || interaction.user
    const shopService = new ShopService(client)

    try {
      // Get user's current upgrades
      const upgrades = await shopService.getUserUpgrades(targetUser.id)
      const user = await client.database.getUser(targetUser.id)

      const embed = CustomEmbedBuilder.economy()
        .setTitle(
          `${targetUser.id === interaction.user.id ? "Your" : `${targetUser.username}'s`} Upgrades`
        )
        .setThumbnail(targetUser.displayAvatarURL())
        .setDescription("Current upgrade levels and next upgrade costs")

      // Safe upgrades
      embed.addFields({
        name: "🔒 Safe Upgrade",
        value: `**Current Tier:** ${upgrades.safe.tier}
**Current Capacity:** ${upgrades.safe.capacity.toLocaleString()} ${config.economy.currency.symbol}
**Next Upgrade Cost:** ${upgrades.safe.nextUpgradeCost.toLocaleString()} ${config.economy.currency.symbol}
**Max Tier:** ${config.economy.safe.maxTier || "Unlimited"}`,
        inline: false,
      })

      // Show if user can afford the next upgrade
      const canAffordSafe = user.balance >= upgrades.safe.nextUpgradeCost
      const safeStatus = canAffordSafe ? "✅ Can afford" : "❌ Cannot afford"

      if (
        upgrades.safe.tier <
        (config.economy.safe.maxTier || Number.POSITIVE_INFINITY)
      ) {
        embed.addFields({
          name: "💰 Upgrade Status",
          value: `Safe: ${safeStatus}`,
          inline: true,
        })
      } else {
        embed.addFields({
          name: "🏆 Max Level Reached",
          value: "Your safe is at maximum tier!",
          inline: true,
        })
      }

      // Add instructions
      embed.addFields({
        name: "📝 How to Upgrade",
        value: "Use `/shop buy safe_upgrade` to upgrade your safe capacity",
        inline: false,
      })

      // Add current balance for reference
      embed.addFields({
        name: "💵 Current Balance",
        value: `${user.balance.toLocaleString()} ${config.economy.currency.symbol}`,
        inline: true,
      })

      await interaction.reply({ embeds: [embed] })
    } catch (error: unknown) {
      const errorEmbed = client.errorHandler.createUserError(
        (error as any).message
      )
      await interaction.reply({ embeds: [errorEmbed], ephemeral: true })
    }
  },
}

export default command
