import { SlashCommandBuilder, type ChatInputCommandInteraction, EmbedBuilder } from "discord.js"
import { botInfo } from "../../utils/bot-info"
import { getOrCreateUserEconomy } from "../../utils/economy-manager"
import { placeBet, processWin, GAME_TYPES, updateGamblingStats } from "../../utils/gambling-manager"

// Russian Roulette configuration
const ROULETTE_CONFIG = {
  CHAMBERS: 6,
  MULTIPLIER: 5, // 5x multiplier for surviving
  COOLDOWN_MINUTES: 5, // 5 minute cooldown
  MIN_BET: 1,
  MAX_BET: 1000000,
}

// Store cooldowns (in production, this should be in database)
const cooldowns = new Map<string, number>()

// Slash command definition
export const data = new SlashCommandBuilder()
  .setName("russian-roulette")
  .setDescription("Play Russian Roulette - ALL IN ONLY! Risk your entire balance for a 5x multiplier!")
  .addBooleanOption((option) =>
    option.setName("confirm").setDescription("Confirm you want to risk your ENTIRE balance").setRequired(true),
  )

// Slash command execution
export async function execute(interaction: ChatInputCommandInteraction) {
  const confirm = interaction.options.getBoolean("confirm", true)

  if (!confirm) {
    return interaction.reply({
      content: "❌ You must confirm to play Russian Roulette!",
      ephemeral: true,
    })
  }

  const userId = interaction.user.id
  const username = interaction.user.username

  try {
    // Check cooldown
    const now = Date.now()
    const lastPlayed = cooldowns.get(userId) || 0
    const cooldownEnd = lastPlayed + ROULETTE_CONFIG.COOLDOWN_MINUTES * 60 * 1000

    if (now < cooldownEnd) {
      const timeLeft = Math.ceil((cooldownEnd - now) / 1000 / 60)
      return interaction.reply({
        content: `⏰ Russian Roulette is on cooldown! Try again in ${timeLeft} minute${timeLeft === 1 ? "" : "s"}.`,
        ephemeral: true,
      })
    }

    // Get user's balance
    const economy = await getOrCreateUserEconomy(userId, username)

    if (economy.balance <= 0) {
      return interaction.reply({
        content: "❌ You need coins to play Russian Roulette! Use `/daily claim` to get started.",
        ephemeral: true,
      })
    }

    const betAmount = economy.balance // ALL IN!

    // Place the bet (remove all coins)
    const betResult = await placeBet(userId, username, betAmount, GAME_TYPES.RUSSIAN_ROULETTE)

    if (!betResult.success) {
      return interaction.reply({
        content: `❌ ${betResult.message}`,
        ephemeral: true,
      })
    }

    // Set cooldown
    cooldowns.set(userId, now)

    // Create suspenseful loading message
    const loadingEmbed = new EmbedBuilder()
      .setTitle("🔫 Russian Roulette")
      .setDescription("**Loading the chamber...**\n\n*The cylinder spins...*")
      .setColor(botInfo.colors.warning)
      .addFields(
        { name: "💰 All In Bet", value: `${betAmount.toLocaleString()} coins`, inline: true },
        {
          name: "🎯 Potential Win",
          value: `${(betAmount * ROULETTE_CONFIG.MULTIPLIER).toLocaleString()} coins`,
          inline: true,
        },
        { name: "⚡ Multiplier", value: `${ROULETTE_CONFIG.MULTIPLIER}x`, inline: true },
      )
      .setFooter({ text: `${username} is playing Russian Roulette...` })
      .setTimestamp()

    await interaction.reply({ embeds: [loadingEmbed] })

    // Add suspense with a delay
    await new Promise((resolve) => setTimeout(resolve, 3000))

    // Determine outcome (1 in 6 chance of death)
    const chamber = Math.floor(Math.random() * ROULETTE_CONFIG.CHAMBERS) + 1
    const bulletChamber = 1 // The bullet is always in chamber 1 for simplicity
    const survived = chamber !== bulletChamber

    let resultEmbed: EmbedBuilder

    if (survived) {
      // Player survives - calculate winnings
      const winnings = betAmount * ROULETTE_CONFIG.MULTIPLIER

      // Process the win
      await processWin(userId, username, betAmount, winnings, GAME_TYPES.RUSSIAN_ROULETTE)

      // Get updated balance
      const updatedEconomy = await getOrCreateUserEconomy(userId, username)

      resultEmbed = new EmbedBuilder()
        .setTitle("🎉 SURVIVED! 🎉")
        .setDescription("**CLICK!** *The chamber was empty...*\n\n**You live to gamble another day!**")
        .setColor(botInfo.colors.success)
        .addFields(
          { name: "💀 Chamber", value: `${chamber}/6`, inline: true },
          { name: "🔫 Bullet Chamber", value: `${bulletChamber}/6`, inline: true },
          { name: "🍀 Outcome", value: "**SURVIVED**", inline: true },
          { name: "💰 Bet Amount", value: `${betAmount.toLocaleString()} coins`, inline: true },
          { name: "🎊 Winnings", value: `${winnings.toLocaleString()} coins`, inline: true },
          { name: "📈 Profit", value: `${(winnings - betAmount).toLocaleString()} coins`, inline: true },
          { name: "💵 New Balance", value: `${updatedEconomy.balance.toLocaleString()} coins`, inline: true },
          { name: "⏰ Cooldown", value: `${ROULETTE_CONFIG.COOLDOWN_MINUTES} minutes`, inline: true },
        )
        .setFooter({ text: `${username} survived Russian Roulette!` })
        .setTimestamp()
    } else {
      // Player dies - loses everything (already deducted)
      await updateGamblingStats(userId, betAmount, 0, -betAmount)

      resultEmbed = new EmbedBuilder()
        .setTitle("💀 BANG! 💀")
        .setDescription("**BANG!** *The bullet finds its mark...*\n\n**You have been eliminated!**")
        .setColor(botInfo.colors.error)
        .addFields(
          { name: "💀 Chamber", value: `${chamber}/6`, inline: true },
          { name: "🔫 Bullet Chamber", value: `${bulletChamber}/6`, inline: true },
          { name: "☠️ Outcome", value: "**ELIMINATED**", inline: true },
          { name: "💸 Lost", value: `${betAmount.toLocaleString()} coins`, inline: true },
          { name: "💵 Remaining Balance", value: "0 coins", inline: true },
          { name: "⏰ Cooldown", value: `${ROULETTE_CONFIG.COOLDOWN_MINUTES} minutes`, inline: true },
        )
        .setFooter({ text: `${username} was eliminated in Russian Roulette!` })
        .setTimestamp()
    }

    // Add game statistics
    const survivalRate = (((ROULETTE_CONFIG.CHAMBERS - 1) / ROULETTE_CONFIG.CHAMBERS) * 100).toFixed(1)
    resultEmbed.addFields({
      name: "📊 Game Statistics",
      value: `Survival Rate: ${survivalRate}% • Death Rate: ${(100 - Number.parseFloat(survivalRate)).toFixed(1)}% • Multiplier: ${ROULETTE_CONFIG.MULTIPLIER}x`,
      inline: false,
    })

    await interaction.editReply({ embeds: [resultEmbed] })
  } catch (error) {
    await interaction.editReply({
      content: "❌ An error occurred while playing Russian Roulette!",
    })
  }
}