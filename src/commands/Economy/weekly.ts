import { SlashCommandBuilder, type ChatInputCommandInteraction, EmbedBuilder } from "discord.js"
import { getOrCreateUserEconomy, addCurrency, TRANSACTION_TYPES } from "../../utils/economy-manager"
import { getDb } from "../../utils/database"
import { botInfo } from "../../utils/bot-info"
import { config } from "../../utils/config"

export const data = new SlashCommandBuilder()
  .setName("weekly")
  .setDescription("Claim your weekly reward or check status")
  .addSubcommand((subcommand) => subcommand.setName("claim").setDescription("Claim your weekly reward"))
  .addSubcommand((subcommand) => subcommand.setName("status").setDescription("Check your weekly reward status"))

export async function execute(interaction: ChatInputCommandInteraction) {
  const subcommand = interaction.options.getSubcommand()

  try {
    if (subcommand === "status") {
      const now = Date.now()
      const WEEKLY_COOLDOWN = 7 * 24 * 60 * 60 * 1000 // 7 days
      const lastWeekly = await getLastWeekly(interaction.user.id)
      const weeklyStreak = await getWeeklyStreak(interaction.user.id)

      const timeUntilNext = lastWeekly ? lastWeekly + WEEKLY_COOLDOWN - now : 0
      const canClaim = timeUntilNext <= 0

      const multiplier = Math.min(1 + (weeklyStreak - 1) * 0.15, 4) // 15% increase per streak, max 4x
      const baseReward = 750
      const nextReward = Math.floor(baseReward * multiplier)

      const embed = new EmbedBuilder()
        .setTitle("📅 Weekly Reward Status")
        .setColor(canClaim ? botInfo.colors.success : botInfo.colors.primary)
        .setThumbnail(interaction.user.displayAvatarURL())
        .addFields(
          { name: "🔥 Current Streak", value: `${weeklyStreak} weeks`, inline: true },
          { name: "💰 Next Reward", value: `${nextReward.toLocaleString()} coins`, inline: true },
          { name: "📈 Multiplier", value: `${multiplier.toFixed(1)}x`, inline: true },
        )

      if (canClaim) {
        embed.setDescription("✅ **Your weekly reward is ready to claim!**\nUse `/weekly claim` to collect it.")
      } else {
        const hours = Math.floor(timeUntilNext / (60 * 60 * 1000))
        const minutes = Math.floor((timeUntilNext % (60 * 60 * 1000)) / (60 * 1000))
        embed.setDescription(`⏰ **Next reward available in:** ${hours}h ${minutes}m`)
      }

      embed.setFooter({ text: `${config.botName} • Weekly rewards reset every 7 days` })

      await interaction.reply({ embeds: [embed] })
    } else if (subcommand === "claim") {
      const now = Date.now()
      const WEEKLY_COOLDOWN = 7 * 24 * 60 * 60 * 1000 // 7 days
      const lastWeekly = await getLastWeekly(interaction.user.id)

      if (lastWeekly && now - lastWeekly < WEEKLY_COOLDOWN) {
        const timeUntilNext = lastWeekly + WEEKLY_COOLDOWN - now
        const hours = Math.floor(timeUntilNext / (60 * 60 * 1000))
        const minutes = Math.floor((timeUntilNext % (60 * 60 * 1000)) / (60 * 1000))

        return interaction.reply({
          content: `⏰ You can claim your next weekly reward in **${hours}h ${minutes}m**.`,
          ephemeral: true,
        })
      }

      const result = await handleWeeklyReward(interaction.user.id, interaction.user.username)

      const embed = new EmbedBuilder()
        .setTitle("🎉 Weekly Reward Claimed!")
        .setDescription(
          `You've successfully claimed your weekly reward!\n\n` +
            `💰 **Reward:** ${result.reward.toLocaleString()} coins\n` +
            `🔥 **Streak:** ${result.streak} weeks\n` +
            `📈 **Multiplier:** ${result.multiplier.toFixed(1)}x`,
        )
        .setColor(botInfo.colors.success)
        .setThumbnail(interaction.user.displayAvatarURL())

      const updatedUser = await getOrCreateUserEconomy(interaction.user.id, interaction.user.username)
      embed.addFields({ name: "💳 New Balance", value: `${updatedUser.balance.toLocaleString()} coins`, inline: true })

      embed.setFooter({ text: `${config.botName} • Come back in 7 days for your next reward!` })

      await interaction.reply({ embeds: [embed] })
    }
  } catch (error) {
    await interaction.reply({
      content: "❌ An error occurred while processing your weekly reward.",
      ephemeral: true,
    })
  }
}

async function getLastWeekly(userId: string): Promise<number | null> {
  try {
    const db = getDb()
    const result = await db.get("SELECT value FROM bot_settings WHERE key = ?", `last_weekly_${userId}`)
    return result ? Number.parseInt(result.value) : null
  } catch (error) {
    return null
  }
}

async function getWeeklyStreak(userId: string): Promise<number> {
  try {
    const db = getDb()
    const result = await db.get("SELECT value FROM bot_settings WHERE key = ?", `weekly_streak_${userId}`)
    return result ? Number.parseInt(result.value) : 0
  } catch (error) {
    return 0
  }
}

async function handleWeeklyReward(
  userId: string,
  username: string,
): Promise<{ reward: number; streak: number; multiplier: number }> {
  try {
    const db = getDb()
    const now = Date.now()

    const lastWeekly = await getLastWeekly(userId)
    let newStreak = 1

    // Check if continuing streak (within 8 days to allow some flexibility)
    if (lastWeekly && now - lastWeekly < 8 * 24 * 60 * 60 * 1000) {
      const currentStreak = await getWeeklyStreak(userId)
      newStreak = currentStreak + 1
    }

    // Calculate multiplier based on streak
    const multiplier = Math.min(1 + (newStreak - 1) * 0.15, 4) // 15% increase per streak, max 4x
    const baseReward = 750
    const reward = Math.floor(baseReward * multiplier)

    // Update last weekly and streak
    await db.run(
      "INSERT OR REPLACE INTO bot_settings (key, value) VALUES (?, ?)",
      `last_weekly_${userId}`,
      now.toString(),
    )
    await db.run(
      "INSERT OR REPLACE INTO bot_settings (key, value) VALUES (?, ?)",
      `weekly_streak_${userId}`,
      newStreak.toString(),
    )

    // Add the reward
    await addCurrency(
      userId,
      username,
      reward,
      TRANSACTION_TYPES.WEEKLY,
      `Weekly reward (${newStreak}x streak, ${multiplier.toFixed(1)}x multiplier)`,
    )

    return { reward, streak: newStreak, multiplier }
  } catch (error) {
    throw error
  }
}
