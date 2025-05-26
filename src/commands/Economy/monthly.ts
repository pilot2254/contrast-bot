import { SlashCommandBuilder, type ChatInputCommandInteraction, EmbedBuilder } from "discord.js"
import { getOrCreateUserEconomy, addCurrency, TRANSACTION_TYPES } from "../../utils/economy-manager"
import { botInfo } from "../../utils/bot-info"
import { config } from "../../utils/config"
import { getDb } from "../../utils/database"

const MONTHLY_REWARD = 500
const MONTHLY_COOLDOWN = 30 * 24 * 60 * 60 * 1000 // 30 days in milliseconds

export const data = new SlashCommandBuilder()
  .setName("monthly")
  .setDescription("Claim your monthly reward of 500 coins!")

export async function execute(interaction: ChatInputCommandInteraction) {
  try {
    const economy = await getOrCreateUserEconomy(interaction.user.id, interaction.user.username)
    const now = Date.now()

    // Check if user has claimed monthly reward recently
    const db = getDb()
    const lastMonthly = await db.get(
      "SELECT timestamp FROM transactions WHERE user_id = ? AND type = ? ORDER BY timestamp DESC LIMIT 1",
      interaction.user.id,
      TRANSACTION_TYPES.MONTHLY,
    )

    if (lastMonthly && now - lastMonthly.timestamp < MONTHLY_COOLDOWN) {
      const nextClaim = lastMonthly.timestamp + MONTHLY_COOLDOWN
      const embed = new EmbedBuilder()
        .setTitle("⏰ Monthly Reward")
        .setDescription("You've already claimed your monthly reward!")
        .setColor(botInfo.colors.warning)
        .addFields({
          name: "Next Claim Available",
          value: `<t:${Math.floor(nextClaim / 1000)}:R>`,
        })
        .setFooter({ text: config.botName })
        .setTimestamp()

      return interaction.reply({ embeds: [embed], ephemeral: true })
    }

    // Give monthly reward
    await addCurrency(
      interaction.user.id,
      interaction.user.username,
      MONTHLY_REWARD,
      TRANSACTION_TYPES.MONTHLY,
      "Monthly reward claimed",
    )

    const updatedEconomy = await getOrCreateUserEconomy(interaction.user.id, interaction.user.username)

    const embed = new EmbedBuilder()
      .setTitle("🎉 Monthly Reward Claimed!")
      .setDescription(`You received **${MONTHLY_REWARD.toLocaleString()} coins**!`)
      .setColor(botInfo.colors.success)
      .addFields(
        { name: "💰 Reward", value: `${MONTHLY_REWARD.toLocaleString()} coins`, inline: true },
        { name: "💵 New Balance", value: `${updatedEconomy.balance.toLocaleString()} coins`, inline: true },
        { name: "⏰ Next Claim", value: `<t:${Math.floor((now + MONTHLY_COOLDOWN) / 1000)}:R>`, inline: true },
      )
      .setFooter({ text: config.botName })
      .setTimestamp()

    await interaction.reply({ embeds: [embed] })
  } catch (error) {
    await interaction.reply({
      content: "❌ An error occurred while claiming your monthly reward.",
      ephemeral: true,
    })
  }
}
