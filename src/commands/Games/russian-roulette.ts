import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  ComponentType,
} from "discord.js"
import { botInfo } from "../../utils/bot-info"
import { config } from "../../utils/config"
import { getOrCreateUserEconomy, removeCurrency, TRANSACTION_TYPES } from "../../utils/economy-manager"
import { processWin, GAME_TYPES } from "../../utils/gambling-manager"
import { awardGamePlayedXp } from "../../utils/level-manager"
import { checkRateLimit, RATE_LIMITS, getRemainingCooldown } from "../../utils/rate-limiter"

// Multipliers for each bullet count
const BULLET_MULTIPLIERS = { 1: 2, 2: 4, 3: 6, 4: 8, 5: 10 }

export const data = new SlashCommandBuilder()
  .setName("russian-roulette")
  .setDescription("Play Russian Roulette! ALL-IN only - High risk, high reward!")
  .addIntegerOption((option) =>
    option
      .setName("bullets")
      .setDescription("Number of bullets in the 6-chamber cylinder (1-5)")
      .setRequired(false)
      .setMinValue(1)
      .setMaxValue(5),
  )

export async function execute(interaction: ChatInputCommandInteraction) {
  // Rate limiting
  if (!checkRateLimit(interaction.user.id, "russian-roulette", RATE_LIMITS.GAMBLING)) {
    const remaining = getRemainingCooldown(interaction.user.id, "russian-roulette", RATE_LIMITS.GAMBLING)
    return interaction.reply({
      content: `⏰ You're doing that too fast! Try again in ${Math.ceil(remaining / 1000)} seconds.`,
      ephemeral: true,
    })
  }

  const bulletCount = interaction.options.getInteger("bullets") || 1

  try {
    const economy = await getOrCreateUserEconomy(interaction.user.id, interaction.user.username)

    if (economy.balance <= 0) {
      return interaction.reply({
        content: "❌ You need coins to play Russian Roulette! Use `/work` to get some coins.",
        ephemeral: true,
      })
    }

    const gameData = {
      allInAmount: economy.balance,
      multiplier: BULLET_MULTIPLIERS[bulletCount as keyof typeof BULLET_MULTIPLIERS],
      bulletCount,
    }

    // Show confirmation and wait for response
    const confirmed = await showConfirmation(interaction, gameData)
    if (!confirmed) return

    // Play the game
    await playRussianRoulette(interaction, gameData)
  } catch (error) {
    await interaction.reply({
      content: "❌ An error occurred while setting up Russian Roulette.",
      ephemeral: true,
    })
  }
}

async function showConfirmation(interaction: ChatInputCommandInteraction, gameData: any): Promise<boolean> {
  const { allInAmount, multiplier, bulletCount } = gameData
  const potentialWinnings = Math.floor(allInAmount * multiplier)
  const survivalChance = Math.round(((6 - bulletCount) / 6) * 100)

  const embed = new EmbedBuilder()
    .setTitle("🔫 Russian Roulette - ALL-IN CONFIRMATION")
    .setDescription(
      `⚠️ **WARNING: This is an ALL-IN game!** ⚠️\n\n` +
        `🎯 Bullets: **${bulletCount}/6** | 💰 Bet: **${allInAmount.toLocaleString()}** coins\n` +
        `⚡ Multiplier: **${multiplier}x** | 💎 Potential: **${potentialWinnings.toLocaleString()}** coins\n` +
        `💀 Survival chance: **${survivalChance}%**\n\n` +
        `**Win:** Get ${multiplier}x your balance | **Lose:** Lose everything`,
    )
    .setColor(botInfo.colors.error)
    .setFooter({ text: `${config.botName} • Are you sure you want to risk everything?` })

  const confirmButton = new ButtonBuilder()
    .setCustomId("rr_confirm")
    .setLabel("🔫 RISK IT ALL")
    .setStyle(ButtonStyle.Danger)

  const cancelButton = new ButtonBuilder()
    .setCustomId("rr_cancel")
    .setLabel("❌ Cancel")
    .setStyle(ButtonStyle.Secondary)

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(confirmButton, cancelButton)
  const response = await interaction.reply({ embeds: [embed], components: [row], ephemeral: true })

  try {
    const confirmation = await response.awaitMessageComponent({
      componentType: ComponentType.Button,
      time: 30000,
      filter: (i) => i.user.id === interaction.user.id,
    })

    if (confirmation.customId === "rr_cancel") {
      await confirmation.update({
        embeds: [
          new EmbedBuilder()
            .setTitle("🔫 Russian Roulette Cancelled")
            .setDescription("You decided not to risk it all. Wise choice!")
            .setColor(botInfo.colors.warning),
        ],
        components: [],
      })
      return false
    }

    await confirmation.deferUpdate()
    return true
  } catch {
    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setTitle("🔫 Russian Roulette Timeout")
          .setDescription("You took too long to decide. The game has been cancelled.")
          .setColor(botInfo.colors.warning),
      ],
      components: [],
    })
    return false
  }
}

async function playRussianRoulette(interaction: ChatInputCommandInteraction, gameData: any) {
  const { allInAmount, multiplier, bulletCount } = gameData

  // Verify balance and place bet
  const economy = await getOrCreateUserEconomy(interaction.user.id, interaction.user.username)

  // Double-check balance before proceeding (safety check for race conditions)
  if (economy.balance < allInAmount) {
    return interaction.editReply({
      content: `❌ Insufficient funds. Your current balance is ${economy.balance.toLocaleString()} coins.`,
      embeds: [],
      components: [],
    })
  }

  const betResult = await removeCurrency(
    interaction.user.id,
    interaction.user.username,
    allInAmount,
    TRANSACTION_TYPES.GAMBLING_BET,
    `Russian Roulette ALL-IN (${bulletCount} bullets)`,
  )

  if (!betResult.success) {
    return interaction.editReply({
      content: `❌ ${betResult.message}`,
      embeds: [],
      components: [],
    })
  }

  // Game logic
  const bulletChambers = generateBulletChambers(bulletCount)
  const pulledChamber = Math.floor(Math.random() * 6) + 1
  const survived = !bulletChambers.includes(pulledChamber)

  // Handle winnings
  let winnings = 0
  if (survived) {
    winnings = Math.floor(allInAmount * multiplier)
    await processWin(interaction.user.id, interaction.user.username, allInAmount, winnings, GAME_TYPES.RUSSIAN_ROULETTE)
  }

  // Award XP
  await awardGamePlayedXp(interaction.user.id, interaction.user.username, survived)

  // Show results
  await showResults(interaction, {
    allInAmount,
    multiplier,
    bulletCount,
    bulletChambers,
    pulledChamber,
    survived,
    winnings,
  })
}

function generateBulletChambers(bulletCount: number): number[] {
  const bulletChambers: number[] = []
  for (let i = 0; i < bulletCount; i++) {
    let chamber
    do {
      chamber = Math.floor(Math.random() * 6) + 1
    } while (bulletChambers.includes(chamber))
    bulletChambers.push(chamber)
  }
  return bulletChambers
}

async function showResults(interaction: ChatInputCommandInteraction, results: any) {
  const { allInAmount, multiplier, bulletCount, bulletChambers, pulledChamber, survived, winnings } = results

  const chambersDisplay = Array.from({ length: 6 }, (_, i) => {
    const chamberNum = i + 1
    if (chamberNum === pulledChamber) return survived ? "🔫" : "💥"
    if (bulletChambers.includes(chamberNum)) return "💀"
    return "⚪"
  }).join(" ")

  const embed = new EmbedBuilder()
    .setTitle("🔫 Russian Roulette - RESULT")
    .setColor(survived ? botInfo.colors.success : botInfo.colors.error)
    .setDescription(
      survived
        ? `🎉 **INCREDIBLE!** You survived with ${bulletCount} bullet${bulletCount > 1 ? "s" : ""} in the cylinder!\n` +
            `You won **${winnings.toLocaleString()} coins** (${multiplier}x your bet)!`
        : `💀 **BANG!** The chamber wasn't empty...\n` +
            `You lost **${allInAmount.toLocaleString()} coins** (your entire balance).`,
    )
    .addFields(
      { name: "🎯 Chamber Pulled", value: `${pulledChamber}/6`, inline: true },
      { name: "🏆 Result", value: survived ? "🎉 SURVIVED!" : "💀 BANG!", inline: true },
      { name: "💎 Outcome", value: survived ? `+${winnings.toLocaleString()} coins` : "Lost everything", inline: true },
      { name: "🔫 Cylinder", value: chambersDisplay, inline: false },
    )
    .setFooter({ text: `${config.botName} • Requested by ${interaction.user.tag}` })
    .setTimestamp()

  // First, edit the confirmation to show it's processing
  await interaction.editReply({
    embeds: [
      new EmbedBuilder()
        .setTitle("🔫 Russian Roulette - Processing...")
        .setDescription("Game completed! Results posted below.")
        .setColor(botInfo.colors.primary),
    ],
    components: [],
  })

  // Then send the results publicly
  await interaction.followUp({ embeds: [embed] })
}
