import { SlashCommandBuilder, type ChatInputCommandInteraction, EmbedBuilder } from "discord.js"
import { getOrCreateUserEconomy, handleMonthlyReward, TRANSACTION_TYPES } from "../../utils/economy-manager"
import { botInfo } from "../../utils/bot-info"
import { config } from "../../utils/config"
import { getDb } from "../../utils/database"

const MONTHLY_COOLDOWN = 30 * 24 * 60 * 60 * 1000 // 30 days in milliseconds

export const data = new SlashCommandBuilder()
  .setName("monthly")
  .setDescription("Monthly reward commands")
  .addSubcommand((subcommand) =>
    subcommand.setName("claim").setDescription("Claim your monthly reward with streak multipliers!"),
  )
  .addSubcommand((subcommand) =>
    subcommand.setName("status").setDescription("Check your monthly reward status and streak"),
  )

export async function execute(interaction: ChatInputCommandInteraction) {
  const subcommand = interaction.options.getSubcommand()

  if (subcommand === "claim") {
    await handleClaim(interaction)
  } else if (subcommand === "status") {
    await handleStatus(interaction)
  }
}

async function handleClaim(interaction: ChatInputCommandInteraction) {
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

    // Give monthly reward with streak multiplier
    const { reward, streak, multiplier } = await handleMonthlyReward(interaction.user.id, interaction.user.username)
    const updatedEconomy = await getOrCreateUserEconomy(interaction.user.id, interaction.user.username)

    const embed = new EmbedBuilder()
      .setTitle("🎉 Monthly Reward Claimed!")
      .setDescription(
        `You received **${reward.toLocaleString()} coins** with a ${multiplier.toFixed(1)}x streak multiplier!`,
      )
      .setColor(botInfo.colors.success)
      .addFields(
        { name: "💰 Reward", value: `${reward.toLocaleString()} coins`, inline: true },
        { name: "🔥 Monthly Streak", value: `${streak}x`, inline: true },
        { name: "⚡ Multiplier", value: `${multiplier.toFixed(1)}x`, inline: true },
        { name: "💵 New Balance", value: `${updatedEconomy.balance.toLocaleString()} coins`, inline: true },
        { name: "⏰ Next Claim", value: `<t:${Math.floor((now + MONTHLY_COOLDOWN) / 1000)}:R>`, inline: true },
        { name: "📈 Base Reward", value: "500 coins", inline: true },
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

async function handleStatus(interaction: ChatInputCommandInteraction) {
  try {
    const economy = await getOrCreateUserEconomy(interaction.user.id, interaction.user.username)
    const now = Date.now()

    // Check last monthly claim
    const db = getDb()
    const lastMonthly = await db.get(
      "SELECT timestamp FROM transactions WHERE user_id = ? AND type = ? ORDER BY timestamp DESC LIMIT 1",
      interaction.user.id,
      TRANSACTION_TYPES.MONTHLY,
    )

    const canClaim = !lastMonthly || now - lastMonthly.timestamp >= MONTHLY_COOLDOWN
    const nextClaim = lastMonthly ? lastMonthly.timestamp + MONTHLY_COOLDOWN : now
    const currentMultiplier = Math.min(1 + (economy.monthlyStreak - 1) * 0.1, 3)
    const nextMultiplier = Math.min(1 + economy.monthlyStreak * 0.1, 3)

    const embed = new EmbedBuilder()
      .setTitle("📅 Monthly Reward Status")
      .setColor(canClaim ? botInfo.colors.success : botInfo.colors.primary)
      .addFields(
        { name: "🔥 Current Streak", value: `${economy.monthlyStreak}x`, inline: true },
        { name: "⚡ Current Multiplier", value: `${currentMultiplier.toFixed(1)}x`, inline: true },
        { name: "📈 Next Multiplier", value: `${nextMultiplier.toFixed(1)}x`, inline: true },
        { name: "💰 Base Reward", value: "500 coins", inline: true },
        {
          name: "🎁 Current Reward",
          value: `${Math.floor(500 * currentMultiplier).toLocaleString()} coins`,
          inline: true,
        },
        { name: "🚀 Next Reward", value: `${Math.floor(500 * nextMultiplier).toLocaleString()} coins`, inline: true },
        {
          name: canClaim ? "✅ Status" : "⏰ Next Claim",
          value: canClaim ? "Ready to claim!" : `<t:${Math.floor(nextClaim / 1000)}:R>`,
          inline: false,
        },
      )
      .setFooter({ text: config.botName })
      .setTimestamp()

    if (canClaim) {
      embed.setDescription("Your monthly reward is ready to claim! Use `/monthly claim` to get your coins.")
    } else {
      embed.setDescription("Keep your streak going! Monthly rewards get better with consecutive claims.")
    }

    await interaction.reply({ embeds: [embed] })
  } catch (error) {
    await interaction.reply({
      content: "❌ An error occurred while checking your monthly status.",
      ephemeral: true,
    })
  }
}