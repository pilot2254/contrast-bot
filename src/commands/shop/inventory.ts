import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js"
import { ShopService } from "../../services/ShopService"
import { CustomEmbedBuilder } from "../../utils/EmbedBuilder"
import type { ExtendedClient } from "../../structures/ExtendedClient"
import type { Command } from "../../types/Command"

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("inventory")
    .setDescription("View your inventory or another user's inventory")
    .addUserOption((option) => option.setName("user").setDescription("The user to check").setRequired(false)),
  category: "economy",
  cooldown: 3,
  async execute(interaction: ChatInputCommandInteraction, client: ExtendedClient) {
    const targetUser = interaction.options.getUser("user") || interaction.user
    const shopService = new ShopService(client)

    try {
      const inventory = await shopService.getUserInventory(targetUser.id)

      if (inventory.length === 0) {
        const embed = CustomEmbedBuilder.info()
          .setTitle(`${targetUser.id === interaction.user.id ? "Your" : `${targetUser.username}'s`} Inventory`)
          .setDescription("No items in inventory.")

        await interaction.reply({ embeds: [embed] })
        return
      }

      const embed = CustomEmbedBuilder.economy()
        .setTitle(`${targetUser.id === interaction.user.id ? "Your" : `${targetUser.username}'s`} Inventory`)
        .setThumbnail(targetUser.displayAvatarURL())

      inventory.forEach((item) => {
        embed.addFields({
          name: `${item.name} ${item.quantity > 1 ? `x${item.quantity}` : ""}`,
          value: item.description,
          inline: true,
        })
      })

      await interaction.reply({ embeds: [embed] })
    } catch (error: any) {
      const errorEmbed = client.errorHandler.createUserError(error.message)
      await interaction.reply({ embeds: [errorEmbed], ephemeral: true })
    }
  },
}

export default command
