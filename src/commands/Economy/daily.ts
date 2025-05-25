import { SlashCommandBuilder, type ChatInputCommandInteraction, EmbedBuilder } from "discord.js"
import { getOrCreateUserEconomy, TRANSACTION_TYPES, type UserEconomy } from "../../utils/economy-manager"
import { botInfo } from "../../utils/bot-info"
import { config } from "../../utils/config"
import { getDb } from "../../utils/database"

// Daily reward config
const DAILY_CONFIG = {
  BASE_REWARD: 100,
  STREAK_BONUS: 25,
  MAX_STREAK_BONUS: 500,
  STREAK_RESET_HOURS: 48,
  COOLDOWN_HOURS: 20,
}

export const data = new SlashCommandBuilder()
  .setName("daily")
  .setDescription("Claim your daily coins and manage streaks")
  .addSubcommand((subcommand) => subcommand.setName("claim").setDescription("Claim your daily reward"))
  .addSubcommand((subcommand) => subcommand.setName("status").setDescription("Check your daily reward status"))
  .addSubcommand((subcommand) =>
    subcommand
      .setName("leaderboard")
      .setDescription("View the daily streak leaderboard")
      .addIntegerOption((option) =>
        option
          .setName("limit")
          .setDescription("Number of users to show")
          .setRequired(false)
          .setMinValue(1)
          .setMaxValue(20),
      ),
  )

export async function execute(interaction: ChatInputCommandInteraction) {
  const subcommand = interaction.options.getSubcommand()

  try {
    switch (subcommand) {
      case "claim": {
        const result = await claimDailyReward(interaction.user.id, interaction.user.username)

        if (!result.success) {
          const embed = new EmbedBuilder()
            .setTitle("⏰ Daily Reward")
            .setDescription(result.message)
            .setColor(botInfo.colors.warning)
            .setFooter({ text: config.botName })
            .setTimestamp()

          if (result.nextClaimTime) {
            embed.addFields({
              name: "Next Claim Available",
              value: `<t:${Math.floor(result.nextClaimTime / 1000)}:R>`,
            })
          }

          return interaction.reply({ embeds: [embed], ephemeral: true })
        }

        const embed = new EmbedBuilder()
          .setTitle("🎉 Daily Reward Claimed!")
          .setDescription(`You received **${result.reward!.toLocaleString()} coins**!`)
          .setColor(botInfo.colors.success)
          .addFields(
            { name: "💰 Base Reward", value: `${DAILY_CONFIG.BASE_REWARD} coins`, inline: true },
            { name: "🔥 Streak Bonus", value: `${result.streakBonus!} coins`, inline: true },
            { name: "📅 Current Streak", value: `${result.newStreak!} days`, inline: true },
            { name: "💵 New Balance", value: `${result.newBalance!.toLocaleString()} coins`, inline: true },
            { name: "⏰ Next Claim", value: `<t:${Math.floor(result.nextClaimTime! / 1000)}:R>`, inline: true },
          )
          .setFooter({ text: config.botName })
          .setTimestamp()

        // Add special messages for milestones
        if (result.newStreak! % 7 === 0 && result.newStreak! > 0) {
          embed.setDescription(
            `🎊 **WEEKLY MILESTONE!** 🎊\nYou received **${result.reward!.toLocaleString()} coins**!`,
          )
        }

        await interaction.reply({ embeds: [embed] })
        break
      }

      case "status": {
        const economy = await getOrCreateUserEconomy(interaction.user.id, interaction.user.username)
        const status = getDailyStatus(economy)

        const embed = new EmbedBuilder()
          .setTitle("📊 Daily Reward Status")
          .setColor(botInfo.colors.primary)
          .setThumbnail(interaction.user.displayAvatarURL())
          .addFields(
            { name: "🔥 Current Streak", value: `${economy.dailyStreak} days`, inline: true },
            { name: "💰 Next Reward", value: `${calculateDailyReward(economy.dailyStreak + 1)} coins`, inline: true },
          )
          .setFooter({ text: config.botName })
          .setTimestamp()

        if (status.canClaim) {
          embed.setDescription("✅ **You can claim your daily reward now!**")
          embed.addFields({ name: "🎯 Action", value: "Use `/daily claim` to get your coins!" })
        } else {
          embed.setDescription("⏰ **Daily reward is on cooldown**")
          embed.addFields({
            name: "⏰ Next Claim Available",
            value: `<t:${Math.floor(status.nextClaimTime / 1000)}:R>`,
          })
        }

        await interaction.reply({ embeds: [embed], ephemeral: true })
        break
      }

      case "leaderboard": {
        const limit = interaction.options.getInteger("limit") || 10
        const leaderboard = await getDailyStreakLeaderboard(limit)

        if (leaderboard.length === 0) {
          return interaction.reply({ content: "📊 No daily streak data available yet!", ephemeral: true })
        }

        const embed = new EmbedBuilder()
          .setTitle("🔥 Daily Streak Leaderboard")
          .setColor(botInfo.colors.primary)
          .setFooter({ text: `${config.botName} • Showing top ${leaderboard.length} users by daily streak` })
          .setTimestamp()

        const description = leaderboard
          .map((entry, index) => {
            const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `${index + 1}.`
            const streakEmoji = entry.streak >= 30 ? "🏆" : entry.streak >= 7 ? "🔥" : "📅"
            return `${medal} **${entry.username}** ${streakEmoji} ${entry.streak} days`
          })
          .join("\n")

        embed.setDescription(description)

        await interaction.reply({ embeds: [embed] })
        break
      }
    }
  } catch (error) {
    await interaction.reply({
      content: "❌ An error occurred while processing your daily reward request.",
      ephemeral: true,
    })
  }
}

// Helper functions remain the same...
async function claimDailyReward(userId: string, username: string) {
  try {
    const db = getDb()
    const now = Date.now()

    await db.exec("BEGIN TRANSACTION")

    try {
      const economy = await getOrCreateUserEconomy(userId, username)
      const status = getDailyStatus(economy)

      if (!status.canClaim) {
        await db.exec("ROLLBACK")
        return {
          success: false,
          message: "⏰ You've already claimed your daily reward! Come back later.",
          nextClaimTime: status.nextClaimTime,
        }
      }

      // Calculate new streak
      let newStreak = economy.dailyStreak
      const hoursSinceLastDaily = economy.lastDaily === 0 ? 0 : (now - economy.lastDaily) / (1000 * 60 * 60)

      if (economy.lastDaily === 0) {
        newStreak = 1
      } else if (
        hoursSinceLastDaily >= DAILY_CONFIG.COOLDOWN_HOURS &&
        hoursSinceLastDaily <= DAILY_CONFIG.STREAK_RESET_HOURS
      ) {
        newStreak = economy.dailyStreak + 1
      } else if (hoursSinceLastDaily > DAILY_CONFIG.STREAK_RESET_HOURS) {
        newStreak = 1
      } else {
        await db.exec("ROLLBACK")
        return {
          success: false,
          message: "⏰ You've already claimed your daily reward! Come back later.",
          nextClaimTime: economy.lastDaily + DAILY_CONFIG.COOLDOWN_HOURS * 60 * 60 * 1000,
        }
      }

      // Ensure streak is never negative
      newStreak = Math.max(1, newStreak)

      // Calculate rewards
      const baseReward = DAILY_CONFIG.BASE_REWARD
      const streakBonus = calculateStreakBonus(newStreak)
      const totalReward = baseReward + streakBonus

      // Update user economy
      await db.run(
        `UPDATE user_economy 
         SET balance = balance + ?, 
             total_earned = total_earned + ?,
             last_daily = ?,
             daily_streak = ?,
             updated_at = ?
         WHERE user_id = ?`,
        totalReward,
        totalReward,
        now,
        newStreak,
        now,
        userId,
      )

      // Create transaction record
      await db.run(
        `INSERT INTO transactions (user_id, type, amount, description, timestamp)
         VALUES (?, ?, ?, ?, ?)`,
        userId,
        TRANSACTION_TYPES.DAILY,
        totalReward,
        `Daily reward (${newStreak} day streak)`,
        now,
      )

      await db.exec("COMMIT")

      // Get updated balance
      const updatedEconomy = await getOrCreateUserEconomy(userId, username)

      return {
        success: true,
        message: "Daily reward claimed successfully!",
        reward: totalReward,
        streakBonus,
        newStreak,
        newBalance: updatedEconomy.balance,
        nextClaimTime: now + DAILY_CONFIG.COOLDOWN_HOURS * 60 * 60 * 1000,
      }
    } catch (error) {
      await db.exec("ROLLBACK")
      throw error
    }
  } catch (error) {
    return {
      success: false,
      message: "An error occurred while claiming your daily reward.",
    }
  }
}

function getDailyStatus(economy: UserEconomy) {
  const now = Date.now()
  const hoursSinceLastDaily = (now - economy.lastDaily) / (1000 * 60 * 60)

  if (economy.lastDaily === 0 || hoursSinceLastDaily >= DAILY_CONFIG.COOLDOWN_HOURS) {
    return { canClaim: true, nextClaimTime: 0 }
  }

  const nextClaimTime = economy.lastDaily + DAILY_CONFIG.COOLDOWN_HOURS * 60 * 60 * 1000
  return { canClaim: false, nextClaimTime }
}

function calculateStreakBonus(streak: number) {
  const bonus = (streak - 1) * DAILY_CONFIG.STREAK_BONUS
  return Math.min(bonus, DAILY_CONFIG.MAX_STREAK_BONUS)
}

function calculateDailyReward(streak: number) {
  return DAILY_CONFIG.BASE_REWARD + calculateStreakBonus(streak)
}

async function getDailyStreakLeaderboard(limit: number) {
  try {
    const db = getDb()
    const users = await db.all(
      `SELECT user_id, username, daily_streak
       FROM user_economy 
       WHERE daily_streak > 0
       ORDER BY daily_streak DESC 
       LIMIT ?`,
      limit,
    )

    return users.map((user: any, index: number) => ({
      userId: user.user_id,
      username: user.username,
      streak: user.daily_streak,
      rank: index + 1,
    }))
  } catch (error) {
    return []
  }
}
