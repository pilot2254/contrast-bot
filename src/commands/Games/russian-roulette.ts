import { SlashCommandBuilder, type ChatInputCommandInteraction, EmbedBuilder } from "discord.js"
import { botInfo } from "../../utils/bot-info"
import { getOrCreateUserEconomy, removeCurrency, addCurrency, TRANSACTION_TYPES } from "../../utils/economy-manager"
import { updateGamblingStats } from "../../utils/gambling-manager"
import { awardGamePlayedXp } from "../../utils/level-manager"

// Game config
const CHAMBERS = 6
const COOLDOWN_MINUTES = 5

// Store cooldowns (in memory for now)
const cooldowns = new Map<string, number>()

// Calculate multiplier based on bullets (more bullets = higher risk = higher reward)
function getMultiplier(bullets: number): number {
  // Fixed multipliers for balanced gameplay
  const multipliers = {
    1: 2, // 83.3% survival, 16.7% death
    2: 4, // 66.7% survival, 33.3% death
    3: 6, // 50% survival, 50% death
    4: 8, // 33.3% survival, 66.7% death
    5: 10, // 16.7% survival, 83.3% death
  }
  return multipliers[bullets as keyof typeof multipliers] || 2
}

export const data = new SlashCommandBuilder()
  .setName("russian-roulette")
  .setDescription("Play Russian Roulette - ALL IN ONLY! Customize bullets for different risk/reward!")
  .addIntegerOption((option) =>
    option
      .setName("bullets")
      .setDescription("Number of bullets (1-5, default: 1)")
      .setMinValue(1)
      .setMaxValue(5)
      .setRequired(false),
  )
  .addBooleanOption((option) =>
    option.setName("confirm").setDescription("Confirm you want to risk your ENTIRE balance").setRequired(true),
  )

export async function execute(interaction: ChatInputCommandInteraction) {
  const confirm = interaction.options.getBoolean("confirm", true)
  const bullets = interaction.options.getInteger("bullets") ?? 1

  if (!confirm) {
    return interaction.reply({
      content: "❌ You must confirm to play Russian Roulette!",
      flags: 64, // EPHEMERAL
    })
  }

  const userId = interaction.user.id
  const username = interaction.user.username

  try {
    // Check cooldown
    const now = Date.now()
    const lastPlayed = cooldowns.get(userId) || 0
    const cooldownEnd = lastPlayed + COOLDOWN_MINUTES * 60 * 1000

    if (now < cooldownEnd) {
      const timeLeft = Math.ceil((cooldownEnd - now) / 1000 / 60)
      return interaction.reply({
        content: `⏰ On cooldown! Try again in ${timeLeft} minute${timeLeft === 1 ? "" : "s"}.`,
        flags: 64, // EPHEMERAL
      })
    }

    // Get user's balance
    const economy = await getOrCreateUserEconomy(userId, username)
    if (economy.balance <= 0) {
      return interaction.reply({
        content: "❌ You need coins to play! Use `/daily claim` to get started.",
        flags: 64, // EPHEMERAL
      })
    }

    const betAmount = economy.balance // ALL IN!
    const multiplier = getMultiplier(bullets)
    const survivalChance = (((CHAMBERS - bullets) / CHAMBERS) * 100).toFixed(1)

    // Remove ALL coins first (no bet limit for Russian Roulette)
    const removeResult = await removeCurrency(
      userId,
      username,
      betAmount,
      TRANSACTION_TYPES.GAMBLING_BET,
      `Russian Roulette bet (${bullets} bullets)`,
    )

    if (!removeResult.success) {
      return interaction.reply({
        content: `❌ ${removeResult.message}`,
        flags: 64, // EPHEMERAL
      })
    }

    // Set cooldown
    cooldowns.set(userId, now)

    // Create loading message
    const loadingEmbed = new EmbedBuilder()
      .setTitle("🔫 Russian Roulette")
      .setDescription(`**Loading ${bullets} bullet${bullets === 1 ? "" : "s"}...**\n\n*The cylinder spins...*`)
      .setColor(botInfo.colors.warning)
      .addFields(
        { name: "💰 All In Bet", value: `${betAmount.toLocaleString()} coins`, inline: true },
        { name: "🎯 Potential Win", value: `${(betAmount * multiplier).toLocaleString()} coins`, inline: true },
        { name: "🔫 Bullets", value: `${bullets}/${CHAMBERS}`, inline: true },
        { name: "📊 Survival Chance", value: `${survivalChance}%`, inline: true },
        { name: "⚡ Multiplier", value: `${multiplier}x`, inline: true },
      )
      .setFooter({ text: `${username} is playing Russian Roulette...` })
      .setTimestamp()

    await interaction.reply({ embeds: [loadingEmbed] })
    await new Promise((resolve) => setTimeout(resolve, 3000)) // Add suspense

    // Determine outcome
    const chamber = Math.floor(Math.random() * CHAMBERS) + 1
    const bulletChambers = Array.from({ length: bullets }, (_, i) => i + 1) // Bullets in chambers 1, 2, 3, etc.
    const hitBullet = bulletChambers.includes(chamber)
    const survived = !hitBullet

    if (survived) {
      // Player survives - give back original bet + winnings
      const totalWinnings = betAmount * multiplier
      await addCurrency(
        userId,
        username,
        totalWinnings,
        TRANSACTION_TYPES.GAMBLING_WIN,
        `Russian Roulette win (${bullets} bullets)`,
      )

      // Update gambling stats
      await updateGamblingStats(userId, betAmount, totalWinnings, totalWinnings - betAmount)

      const updatedEconomy = await getOrCreateUserEconomy(userId, username)

      const resultEmbed = new EmbedBuilder()
        .setTitle("🎉 SURVIVED! 🎉")
        .setDescription("**CLICK!** *The chamber was empty...*\n\n**You live to gamble another day!**")
        .setColor(botInfo.colors.success)
        .addFields(
          { name: "💀 Chamber Hit", value: `${chamber}/${CHAMBERS}`, inline: true },
          { name: "🔫 Bullet Chambers", value: bulletChambers.join(", "), inline: true },
          { name: "🍀 Outcome", value: "**SURVIVED**", inline: true },
          { name: "💰 Total Winnings", value: `${totalWinnings.toLocaleString()} coins`, inline: true },
          { name: "📈 Profit", value: `${(totalWinnings - betAmount).toLocaleString()} coins`, inline: true },
          { name: "💵 New Balance", value: `${updatedEconomy.balance.toLocaleString()} coins`, inline: true },
        )
        .setFooter({ text: `${username} survived Russian Roulette with ${bullets} bullets!` })
        .setTimestamp()

      await interaction.editReply({ embeds: [resultEmbed] })
    } else {
      // Player dies - money already removed
      await updateGamblingStats(userId, betAmount, 0, -betAmount)

      const resultEmbed = new EmbedBuilder()
        .setTitle("💀 BANG! 💀")
        .setDescription("**BANG!** *The bullet finds its mark...*\n\n**You have been eliminated!**")
        .setColor(botInfo.colors.error)
        .addFields(
          { name: "💀 Chamber Hit", value: `${chamber}/${CHAMBERS}`, inline: true },
          { name: "🔫 Bullet Chambers", value: bulletChambers.join(", "), inline: true },
          { name: "☠️ Outcome", value: "**ELIMINATED**", inline: true },
          { name: "💸 Lost", value: `${betAmount.toLocaleString()} coins`, inline: true },
          { name: "💵 Remaining Balance", value: "0 coins", inline: true },
        )
        .setFooter({ text: `${username} was eliminated in Russian Roulette with ${bullets} bullets!` })
        .setTimestamp()

      await interaction.editReply({ embeds: [resultEmbed] })
    }

    // Award XP for playing games
    await awardGamePlayedXp(interaction.user.id, interaction.user.username, survived)
  } catch (error) {
    // If there's an error, try to refund the user
    try {
      const economy = await getOrCreateUserEconomy(userId, username)
      if (economy.balance === 0) {
        // User lost their money due to error, refund them
        await addCurrency(
          userId,
          username,
          economy.balance,
          TRANSACTION_TYPES.ADMIN_ADD,
          "Russian Roulette error refund",
        )
      }
    } catch (refundError) {
      // Log refund error but don't throw
    }

    await interaction.editReply({ content: "❌ An error occurred while playing Russian Roulette!" })
  }
}
