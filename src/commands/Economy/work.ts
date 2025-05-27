import { SlashCommandBuilder, type ChatInputCommandInteraction, EmbedBuilder } from "discord.js"
import { getOrCreateUserEconomy, addCurrency, TRANSACTION_TYPES } from "../../utils/economy-manager"
import { botInfo } from "../../utils/bot-info"
import { config } from "../../utils/config"
import { awardWorkXp } from "../../utils/level-manager"

// Work configuration
const WORK_CONFIG = {
  COOLDOWN_SECONDS: 10,
  BASE_SALARY: 50,
  BALANCE_MULTIPLIER: 0.001, // 0.1% of current balance
  BONUS_CHANCE: 0.15, // 15% chance for bonus
  BONUS_MULTIPLIER_MIN: 1.5,
  BONUS_MULTIPLIER_MAX: 3.0,
  MAX_SALARY: 10000, // Maximum base salary
}

// Work jobs with different descriptions
const WORK_JOBS = [
  { name: "Software Developer", emoji: "💻", description: "You debugged some code and fixed critical bugs" },
  { name: "Chef", emoji: "👨‍🍳", description: "You cooked delicious meals for hungry customers" },
  { name: "Teacher", emoji: "👨‍🏫", description: "You taught students and helped them learn new things" },
  { name: "Doctor", emoji: "👨‍⚕️", description: "You helped patients and saved lives" },
  { name: "Artist", emoji: "🎨", description: "You created beautiful artwork that inspired others" },
  { name: "Musician", emoji: "🎵", description: "You performed music that brought joy to people" },
  { name: "Writer", emoji: "✍️", description: "You wrote compelling stories and articles" },
  { name: "Engineer", emoji: "⚙️", description: "You designed and built amazing structures" },
  { name: "Scientist", emoji: "🔬", description: "You conducted research and made new discoveries" },
  { name: "Farmer", emoji: "🚜", description: "You grew crops and fed the community" },
  { name: "Delivery Driver", emoji: "🚚", description: "You delivered packages safely and on time" },
  { name: "Mechanic", emoji: "🔧", description: "You fixed vehicles and kept them running smoothly" },
  { name: "Photographer", emoji: "📸", description: "You captured beautiful moments and memories" },
  { name: "Barista", emoji: "☕", description: "You made perfect coffee and brightened people's mornings" },
  { name: "Librarian", emoji: "📚", description: "You helped people find knowledge and organized books" },
]

// Simple rate limiting using Map
const workCooldowns = new Map<string, number>()

export const data = new SlashCommandBuilder()
  .setName("work")
  .setDescription("Go to work and earn money! Higher balance = higher salary")

export async function execute(interaction: ChatInputCommandInteraction) {
  const userId = interaction.user.id
  const now = Date.now()
  const cooldownEnd = workCooldowns.get(userId) || 0

  // Check cooldown
  if (now < cooldownEnd) {
    const remaining = Math.ceil((cooldownEnd - now) / 1000)
    return interaction.reply({
      content: `⏰ You're still tired from your last job! Try again in ${remaining} seconds.`,
      ephemeral: true,
    })
  }

  try {
    const economy = await getOrCreateUserEconomy(interaction.user.id, interaction.user.username)

    // Calculate salary based on balance
    const balanceBonus = Math.floor(economy.balance * WORK_CONFIG.BALANCE_MULTIPLIER)
    const baseSalary = Math.min(WORK_CONFIG.BASE_SALARY + balanceBonus, WORK_CONFIG.MAX_SALARY)

    // Check for bonus (gambling element - chance to earn more)
    const gotBonus = Math.random() < WORK_CONFIG.BONUS_CHANCE
    const bonusMultiplier = gotBonus
      ? WORK_CONFIG.BONUS_MULTIPLIER_MIN +
        Math.random() * (WORK_CONFIG.BONUS_MULTIPLIER_MAX - WORK_CONFIG.BONUS_MULTIPLIER_MIN)
      : 1

    const finalSalary = Math.floor(baseSalary * bonusMultiplier)

    // Set cooldown
    workCooldowns.set(userId, now + WORK_CONFIG.COOLDOWN_SECONDS * 1000)

    // Add earnings to balance
    await addCurrency(
      interaction.user.id,
      interaction.user.username,
      finalSalary,
      TRANSACTION_TYPES.WORK,
      `Work earnings${gotBonus ? " (bonus!)" : ""}`,
    )

    // Award XP for working
    await awardWorkXp(interaction.user.id, interaction.user.username, finalSalary)

    // Get updated balance
    const updatedEconomy = await getOrCreateUserEconomy(interaction.user.id, interaction.user.username)

    // Random job selection
    const job = WORK_JOBS[Math.floor(Math.random() * WORK_JOBS.length)]

    const embed = new EmbedBuilder()
      .setTitle(`${job.emoji} Work Complete!`)
      .setDescription(
        `**Job:** ${job.name}\n` +
          `**Task:** ${job.description}\n\n` +
          `💰 **Earned:** ${finalSalary.toLocaleString()} coins${gotBonus ? ` (${bonusMultiplier.toFixed(1)}x bonus!)` : ""}\n` +
          `💵 **New Balance:** ${updatedEconomy.balance.toLocaleString()} coins`,
      )
      .setColor(gotBonus ? botInfo.colors.success : botInfo.colors.primary)
      .addFields(
        { name: "💼 Base Salary", value: `${WORK_CONFIG.BASE_SALARY.toLocaleString()} coins`, inline: true },
        { name: "📈 Balance Bonus", value: `${balanceBonus.toLocaleString()} coins`, inline: true },
        {
          name: "⏰ Next Work",
          value: `<t:${Math.floor((now + WORK_CONFIG.COOLDOWN_SECONDS * 1000) / 1000)}:R>`,
          inline: true,
        },
      )
      .setFooter({ text: `${config.botName} • Keep working to increase your balance!` })
      .setTimestamp()

    if (gotBonus) {
      embed.addFields({
        name: "🎉 Lucky Bonus!",
        value: `You had an exceptional day at work and earned ${bonusMultiplier.toFixed(1)}x your normal salary!`,
        inline: false,
      })
    }

    await interaction.reply({ embeds: [embed] })
  } catch (error) {
    await interaction.reply({
      content: "❌ An error occurred while processing your work request.",
      ephemeral: true,
    })
  }
}
