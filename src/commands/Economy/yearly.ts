import { SlashCommandBuilder, type ChatInputCommandInteraction, EmbedBuilder } from "discord.js"
import { getOrCreateUserEconomy, addCurrency, TRANSACTION_TYPES } from "../../utils/economy-manager"
import { botInfo } from "../../utils/bot-info"
import { config } from "../../utils/config"
import { getDb } from "../../utils/database"

const YEARLY_REWARD = 1000
const YEARLY_COOLDOWN = 365 * 24 * 60 * 60 * 1000 // 365 days in milliseconds

export const data = new SlashCommandBuilder()
  .setName("yearly")
  .setDescription("Claim your yearly reward of 1000 coins!")

export async function execute(interaction: ChatInputCommandInteraction) {
  try {
    const economy = await getOrCreateUserEconomy(interaction.user.id, interaction.user.username)
    const now = Date.now()

    // Check if user has claimed yearly reward recently
    const db = getDb()
    const lastYearly = await db.get(
      "SELECT timestamp FROM transactions WHERE user_id = ? AND type = ? ORDER BY timestamp DESC LIMIT 1",
      interaction.user.id,
      TRANSACTION_TYPES.YEARLY,
    )

    if (lastYearly && now - lastYearly.timestamp < YEARLY_COOLDOWN) {
      const nextClaim = lastYearly.timestamp + YEARLY_COOLDOWN
      const embed = new EmbedBuilder()
        .setTitle("⏰ Yearly Reward")
        .setDescription("You've already claimed your yearly reward!")
        .setColor(botInfo.colors.warning)
        .addFields({
          name: "Next Claim Available",
          value: `<t:${Math.floor(nextClaim / 1000)}:R>`,
        })
        .setFooter({ text: config.botName })
        .setTimestamp()

      return interaction.reply({ embeds: [embed], ephemeral: true })
    }

    // Give yearly reward
    await addCurrency(
      interaction.user.id,
      interaction.user.username,
      YEARLY_REWARD,
      TRANSACTION_TYPES.YEARLY,
      "Yearly reward claimed",
    )

    const updatedEconomy = await getOrCreateUserEconomy(interaction.user.id, interaction.user.username)

    const embed = new EmbedBuilder()
      .setTitle("🎊 Yearly Reward Claimed!")
      .setDescription(`You received **${YEARLY_REWARD.toLocaleString()} coins**!`)
      .setColor(botInfo.colors.success)
      .addFields(
        { name: "💰 Reward", value: `${YEARLY_REWARD.toLocaleString()} coins`, inline: true },
        { name: "💵 New Balance", value: `${updatedEconomy.balance.toLocaleString()} coins`, inline: true },
        { name: "⏰ Next Claim", value: `<t:${Math.floor((now + YEARLY_COOLDOWN) / 1000)}:R>`, inline: true },
      )
      .setFooter({ text: config.botName })
      .setTimestamp()

    await interaction.reply({ embeds: [embed] })
  } catch (error) {
    await interaction.reply({
      content: "❌ An error occurred while claiming your yearly reward.",
      ephemeral: true,
    })
  }
}
