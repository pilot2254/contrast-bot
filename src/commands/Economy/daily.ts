import { SlashCommandBuilder, type ChatInputCommandInteraction, EmbedBuilder } from "discord.js"
import { getOrCreateUserEconomy, TRANSACTION_TYPES, type UserEconomy } from "../../utils/economy-manager"
import { botInfo } from "../../utils/bot-info"
import { getDb } from "../../utils/database"

// Daily reward configuration
const DAILY_CONFIG = {
  BASE_REWARD: 100, // Base daily reward
  STREAK_BONUS: 25, // Bonus per streak day
  MAX_STREAK_BONUS: 500, // Maximum streak bonus
  STREAK_RESET_HOURS: 48, // Hours before streak resets
  COOLDOWN_HOURS: 20, // Hours between daily claims (allows for some flexibility)
}

// Slash command definition
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
          .setDescription("Number of users to show (1-20)")
          .setRequired(false)
          .setMinValue(1)
          .setMaxValue(20),
      ),
  )

// Slash command execution
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
            .setTimestamp()

          if (result.nextClaimTime) {
            embed.addFields({
              name: "Next Claim Available",
              value: `<t:${Math.floor(result.nextClaimTime / 1000)}:R>`,
              inline: false,
            })
          }

          return interaction.reply({ embeds: [embed], ephemeral: true })
        }

        const embed = new EmbedBuilder()
          .setTitle("🎉 Daily Reward Claimed!")
          .setDescription(`You received **${result.reward!.toLocaleString()} coins**!`)
          .setColor(botInfo.colors.success)
          .addFields(
            { name: "💰 Base Reward", value: `${DAILY_CONFIG.BASE_REWARD.toLocaleString()} coins`, inline: true },
            {
              name: "🔥 Streak Bonus",
              value: `${result.streakBonus!.toLocaleString()} coins`,
              inline: true,
            },
            { name: "📅 Current Streak", value: `${result.newStreak!} days`, inline: true },
            { name: "💵 New Balance", value: `${result.newBalance!.toLocaleString()} coins`, inline: true },
            {
              name: "⏰ Next Claim",
              value: `<t:${Math.floor(result.nextClaimTime! / 1000)}:R>`,
              inline: true,
            },
          )
          .setFooter({ text: `Keep your streak going! Come back tomorrow for more coins.` })
          .setTimestamp()

        // Add special messages for milestones
        if (result.newStreak! % 7 === 0 && result.newStreak! > 0) {
          embed.setDescription(
            `🎊 **WEEKLY MILESTONE!** 🎊\nYou received **${result.reward!.toLocaleString()} coins** for your ${result.newStreak!}-day streak!`,
          )
        } else if (result.newStreak! % 30 === 0 && result.newStreak! > 0) {
          embed.setDescription(
            `🏆 **MONTHLY MILESTONE!** 🏆\nYou received **${result.reward!.toLocaleString()} coins** for your ${result.newStreak!}-day streak!`,
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
            {
              name: "💰 Next Reward",
              value: `${calculateDailyReward(economy.dailyStreak + 1).toLocaleString()} coins`,
              inline: true,
            },
            { name: "📈 Streak Bonus", value: `${calculateStreakBonus(economy.dailyStreak + 1)} coins`, inline: true },
          )
          .setTimestamp()

        if (status.canClaim) {
          embed.setDescription("✅ **You can claim your daily reward now!**")
          embed.addFields({
            name: "🎯 Action",
            value: "Use `/daily claim` to get your coins!",
            inline: false,
          })
        } else {
          embed.setDescription("⏰ **Daily reward is on cooldown**")
          embed.addFields({
            name: "⏰ Next Claim Available",
            value: `<t:${Math.floor(status.nextClaimTime / 1000)}:R>`,
            inline: false,
          })
        }

        // Add streak information
        if (economy.dailyStreak > 0) {
          embed.addFields({
            name: "📅 Last Claimed",
            value: `<t:${Math.floor(economy.lastDaily / 1000)}:R>`,
            inline: true,
          })
        }

        // Add milestone progress
        const nextMilestone = getNextMilestone(economy.dailyStreak)
        if (nextMilestone) {
          embed.addFields({
            name: "🎯 Next Milestone",
            value: `${nextMilestone.days} days (${nextMilestone.days - economy.dailyStreak} days to go)`,
            inline: true,
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
          .setTimestamp()

        const description = leaderboard
          .map((entry, index) => {
            const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `${index + 1}.`
            const streakEmoji = entry.streak >= 30 ? "🏆" : entry.streak >= 7 ? "🔥" : "📅"
            return `${medal} **${entry.username}** ${streakEmoji} ${entry.streak} days`
          })
          .join("\n")

        embed.setDescription(description)
        embed.setFooter({ text: `Showing top ${leaderboard.length} users by daily streak` })

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

/**
 * Claims the daily reward for a user
 */
async function claimDailyReward(
  userId: string,
  username: string,
): Promise<{
  success: boolean
  message: string
  reward?: number
  streakBonus?: number
  newStreak?: number
  newBalance?: number
  nextClaimTime?: number
}> {
  try {
    const db = getDb()
    const now = Date.now()

    // Start transaction
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
        // First time claiming
        newStreak = 1
      } else if (
        hoursSinceLastDaily >= DAILY_CONFIG.COOLDOWN_HOURS &&
        hoursSinceLastDaily <= DAILY_CONFIG.STREAK_RESET_HOURS
      ) {
        // Within streak window and past cooldown
        newStreak = economy.dailyStreak + 1
      } else if (hoursSinceLastDaily > DAILY_CONFIG.STREAK_RESET_HOURS) {
        // Streak broken, reset to 1
        newStreak = 1
      } else {
        // Still in cooldown period
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

/**
 * Gets the daily claim status for a user
 */
function getDailyStatus(economy: UserEconomy): { canClaim: boolean; nextClaimTime: number } {
  const now = Date.now()
  const hoursSinceLastDaily = (now - economy.lastDaily) / (1000 * 60 * 60)

  if (economy.lastDaily === 0 || hoursSinceLastDaily >= DAILY_CONFIG.COOLDOWN_HOURS) {
    return { canClaim: true, nextClaimTime: 0 }
  }

  const nextClaimTime = economy.lastDaily + DAILY_CONFIG.COOLDOWN_HOURS * 60 * 60 * 1000
  return { canClaim: false, nextClaimTime }
}

/**
 * Calculates the streak bonus for a given streak
 */
function calculateStreakBonus(streak: number): number {
  const bonus = (streak - 1) * DAILY_CONFIG.STREAK_BONUS
  return Math.min(bonus, DAILY_CONFIG.MAX_STREAK_BONUS)
}

/**
 * Calculates the total daily reward for a given streak
 */
function calculateDailyReward(streak: number): number {
  return DAILY_CONFIG.BASE_REWARD + calculateStreakBonus(streak)
}

/**
 * Gets the next milestone for a streak
 */
function getNextMilestone(currentStreak: number): { days: number; name: string } | null {
  const milestones = [
    { days: 7, name: "Weekly" },
    { days: 14, name: "Bi-weekly" },
    { days: 30, name: "Monthly" },
    { days: 60, name: "Bi-monthly" },
    { days: 100, name: "Centurion" },
    { days: 365, name: "Annual" },
  ]

  return milestones.find((milestone) => milestone.days > currentStreak) || null
}

/**
 * Gets the daily streak leaderboard
 */
async function getDailyStreakLeaderboard(
  limit: number,
): Promise<{ userId: string; username: string; streak: number; rank: number }[]> {
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
