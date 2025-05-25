import { SlashCommandBuilder, type ChatInputCommandInteraction, EmbedBuilder } from "discord.js"
import { botInfo } from "../../utils/bot-info"
import { getOrCreateUserEconomy } from "../../utils/economy-manager"
import { placeBet, processWin, GAME_TYPES, updateGamblingStats } from "../../utils/gambling-manager"

// Game config
const MULTIPLIER = 5
const CHAMBERS = 6
const COOLDOWN_MINUTES = 5

// Store cooldowns (in memory for now)
const cooldowns = new Map<string, number>()

export const data = new SlashCommandBuilder()
  .setName("russian-roulette")
  .setDescription("Play Russian Roulette - ALL IN ONLY! Risk your entire balance for a 5x multiplier!")
  .addBooleanOption((option) =>
    option.setName("confirm").setDescription("Confirm you want to risk your ENTIRE balance").setRequired(true),
  )

export async function execute(interaction: ChatInputCommandInteraction) {
  const confirm = interaction.options.getBoolean("confirm", true)
  if (!confirm) {
    return interaction.reply({ content: "❌ You must confirm to play Russian Roulette!", ephemeral: true })
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
        ephemeral: true,
      })
    }

    // Get user's balance
    const economy = await getOrCreateUserEconomy(userId, username)
    if (economy.balance <= 0) {
      return interaction.reply({
        content: "❌ You need coins to play! Use `/daily claim` to get started.",
        ephemeral: true,
      })
    }

    const betAmount = economy.balance // ALL IN!
    const betResult = await placeBet(userId, username, betAmount, GAME_TYPES.RUSSIAN_ROULETTE)
    if (!betResult.success) {
      return interaction.reply({ content: `❌ ${betResult.message}`, ephemeral: true })
    }

    // Set cooldown
    cooldowns.set(userId, now)

    // Create loading message
    const loadingEmbed = new EmbedBuilder()
      .setTitle("🔫 Russian Roulette")
      .setDescription("**Loading the chamber...**\n\n*The cylinder spins...*")
      .setColor(botInfo.colors.warning)
      .addFields(
        { name: "💰 All In Bet", value: `${betAmount.toLocaleString()} coins`, inline: true },
        { name: "🎯 Potential Win", value: `${(betAmount * MULTIPLIER).toLocaleString()} coins`, inline: true },
      )
      .setFooter({ text: `${username} is playing Russian Roulette...` })
      .setTimestamp()

    await interaction.reply({ embeds: [loadingEmbed] })
    await new Promise((resolve) => setTimeout(resolve, 3000)) // Add suspense

    // Determine outcome (1 in 6 chance of death)
    const chamber = Math.floor(Math.random() * CHAMBERS) + 1
    const bulletChamber = 1 // The bullet is always in chamber 1
    const survived = chamber !== bulletChamber

    if (survived) {
      // Player survives
      const winnings = betAmount * MULTIPLIER
      await processWin(userId, username, betAmount, winnings, GAME_TYPES.RUSSIAN_ROULETTE)
      const updatedEconomy = await getOrCreateUserEconomy(userId, username)

      const resultEmbed = new EmbedBuilder()
        .setTitle("🎉 SURVIVED! 🎉")
        .setDescription("**CLICK!** *The chamber was empty...*\n\n**You live to gamble another day!**")
        .setColor(botInfo.colors.success)
        .addFields(
          { name: "💀 Chamber", value: `${chamber}/6`, inline: true },
          { name: "🍀 Outcome", value: "**SURVIVED**", inline: true },
          { name: "💰 Winnings", value: `${winnings.toLocaleString()} coins`, inline: true },
          { name: "💵 New Balance", value: `${updatedEconomy.balance.toLocaleString()} coins`, inline: true },
        )
        .setFooter({ text: `${username} survived Russian Roulette!` })
        .setTimestamp()

      await interaction.editReply({ embeds: [resultEmbed] })
    } else {
      // Player dies
      await updateGamblingStats(userId, betAmount, 0, -betAmount)

      const resultEmbed = new EmbedBuilder()
        .setTitle("💀 BANG! 💀")
        .setDescription("**BANG!** *The bullet finds its mark...*\n\n**You have been eliminated!**")
        .setColor(botInfo.colors.error)
        .addFields(
          { name: "💀 Chamber", value: `${chamber}/6`, inline: true },
          { name: "☠️ Outcome", value: "**ELIMINATED**", inline: true },
          { name: "💸 Lost", value: `${betAmount.toLocaleString()} coins`, inline: true },
        )
        .setFooter({ text: `${username} was eliminated in Russian Roulette!` })
        .setTimestamp()

      await interaction.editReply({ embeds: [resultEmbed] })
    }
  } catch (error) {
    await interaction.editReply({ content: "❌ An error occurred while playing Russian Roulette!" })
  }
}
