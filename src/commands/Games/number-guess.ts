import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  EmbedBuilder,
  type Message,
  type TextChannel,
} from "discord.js"
import { botInfo } from "../../utils/bot-info"
import { config } from "../../utils/config"
import { placeBet, processWin, GAME_TYPES } from "../../utils/gambling-manager"
import { awardGamePlayedXp } from "../../utils/level-manager"

// Slash command definition
export const data = new SlashCommandBuilder()
  .setName("number-guess")
  .setDescription("Guess a number between 1-100! Fewer attempts = higher multiplier!")
  .addIntegerOption((option) =>
    option
      .setName("bet")
      .setDescription("Amount to bet (optional)")
      .setRequired(false)
      .setMinValue(1)
      .setMaxValue(100000),
  )

// Slash command execution
export async function execute(interaction: ChatInputCommandInteraction) {
  const betAmount = interaction.options.getInteger("bet") || 0
  const isGambling = betAmount > 0

  if (isGambling) {
    // Handle betting logic
    const betResult = await placeBet(interaction.user.id, interaction.user.username, betAmount, GAME_TYPES.NUMBER_GUESS)

    if (!betResult.success) {
      return interaction.reply({ content: `❌ ${betResult.message}`, ephemeral: true })
    }
  }

  const randomNumber = Math.floor(Math.random() * 100) + 1
  let guess: number | null = null
  let attempts = 0
  const maxAttempts = 10

  const embed = new EmbedBuilder()
    .setTitle("🔢 Number Guessing Game")
    .setDescription(
      `I've picked a number between **1 and 100**. You have **${maxAttempts} attempts** to guess it!\n\n` +
        (isGambling
          ? `💰 **Bet:** ${betAmount.toLocaleString()} coins\n` +
            `⚡ **Multiplier:** Depends on attempts used\n` +
            `💎 **Max Payout:** ${(betAmount * 10).toLocaleString()} coins (1 attempt)`
          : "🎯 **For fun mode** - no coins at stake!") +
        "\n\n**Start guessing by typing a number!**",
    )
    .setColor(botInfo.colors.primary)
    .setFooter({ text: `${config.botName} • You have ${maxAttempts} attempts` })
    .setTimestamp()

  await interaction.reply({ embeds: [embed] })

  // Type guard to ensure we have a text-based channel that supports message collection
  if (!interaction.channel || !("createMessageCollector" in interaction.channel)) {
    return interaction.followUp({
      content: "❌ This game cannot be played in this type of channel.",
      ephemeral: true,
    })
  }

  const filter = (m: Message) => m.author.id === interaction.user.id && !isNaN(Number.parseInt(m.content))
  const collector = (interaction.channel as TextChannel).createMessageCollector({
    filter,
    time: 120000, // 2 minutes
    max: maxAttempts,
  })

  collector.on("collect", async (m: Message) => {
    attempts++
    guess = Number.parseInt(m.content)

    if (guess < 1 || guess > 100) {
      await interaction.followUp({
        content: "❌ Please guess a number between 1 and 100!",
        ephemeral: true,
      })
      return
    }

    if (guess === randomNumber) {
      // Player won!
      const multiplier = getMultiplierForAttempts(attempts)
      let winnings = 0

      if (isGambling) {
        winnings = Math.floor(betAmount * multiplier)
        await processWin(interaction.user.id, interaction.user.username, betAmount, winnings, GAME_TYPES.NUMBER_GUESS)
      }

      // Award XP for winning
      await awardGamePlayedXp(interaction.user.id, interaction.user.username, true)

      const winEmbed = new EmbedBuilder()
        .setTitle("🎉 Congratulations!")
        .setDescription(
          `You guessed the number **${randomNumber}** in **${attempts}** attempt${attempts === 1 ? "" : "s"}!`,
        )
        .setColor(botInfo.colors.success)
        .addFields(
          { name: "🎯 Number", value: randomNumber.toString(), inline: true },
          { name: "🔢 Attempts", value: attempts.toString(), inline: true },
          { name: "⚡ Multiplier", value: `${multiplier}x`, inline: true },
        )
        .setFooter({ text: `${config.botName} • Amazing guess!` })
        .setTimestamp()

      if (isGambling) {
        winEmbed.addFields(
          { name: "💰 Bet", value: `${betAmount.toLocaleString()} coins`, inline: true },
          { name: "💎 Winnings", value: `${winnings.toLocaleString()} coins`, inline: true },
          { name: "📊 Profit", value: `+${(winnings - betAmount).toLocaleString()} coins`, inline: true },
        )
      }

      await interaction.followUp({ embeds: [winEmbed] })
      collector.stop()
      return
    }

    // Give hint
    const hint = guess < randomNumber ? "📈 Too low! Guess higher." : "📉 Too high! Guess lower."
    const attemptsLeft = maxAttempts - attempts

    if (attemptsLeft > 0) {
      await interaction.followUp({
        content: `${hint} (${attemptsLeft} attempt${attemptsLeft === 1 ? "" : "s"} left)`,
        ephemeral: true,
      })
    }
  })

  collector.on("end", async (collected, reason) => {
    if (reason === "limit" || (collected.size > 0 && guess !== randomNumber)) {
      // Player lost - ran out of attempts
      if (isGambling) {
        // Bet was already deducted when placed
      }

      // Award XP for playing (but not winning)
      await awardGamePlayedXp(interaction.user.id, interaction.user.username, false)

      const loseEmbed = new EmbedBuilder()
        .setTitle("💀 Game Over!")
        .setDescription(`You ran out of attempts! The number was **${randomNumber}**.`)
        .setColor(botInfo.colors.error)
        .addFields(
          { name: "🎯 Correct Number", value: randomNumber.toString(), inline: true },
          { name: "🔢 Attempts Used", value: maxAttempts.toString(), inline: true },
          { name: "🎮 Result", value: "Better luck next time!", inline: true },
        )
        .setFooter({ text: `${config.botName} • Try again!` })
        .setTimestamp()

      if (isGambling) {
        loseEmbed.addFields({
          name: "💸 Lost",
          value: `${betAmount.toLocaleString()} coins`,
          inline: true,
        })
      }

      await interaction.followUp({ embeds: [loseEmbed] })
    } else if (reason === "time" && guess === null) {
      // Timeout with no guesses
      const timeoutEmbed = new EmbedBuilder()
        .setTitle("⏰ Time's Up!")
        .setDescription("You didn't make any guesses in time.")
        .setColor(botInfo.colors.warning)
        .setFooter({ text: `${config.botName} • Try again when you're ready!` })
        .setTimestamp()

      await interaction.followUp({ embeds: [timeoutEmbed] })
    }
  })
}

// Helper function to calculate multiplier based on attempts
function getMultiplierForAttempts(attempts: number): number {
  switch (attempts) {
    case 1:
      return 10 // Perfect guess
    case 2:
      return 8
    case 3:
      return 6
    case 4:
      return 4
    case 5:
      return 3
    case 6:
      return 2.5
    case 7:
      return 2
    case 8:
      return 1.8
    case 9:
      return 1.5
    case 10:
      return 1.2
    default:
      return 1
  }
}
