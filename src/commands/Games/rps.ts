import { SlashCommandBuilder, type ChatInputCommandInteraction, EmbedBuilder } from "discord.js"
import { logger } from "../../utils/logger"
import { recordGame, getPlayerStats } from "../../utils/rps-manager"
import { botInfo } from "../../utils/bot-info"
import { placeBet, processWin, GAME_TYPES } from "../../utils/gambling-manager"
import { getOrCreateUserEconomy } from "../../utils/economy-manager"

type RPSChoice = "rock" | "paper" | "scissors"
type RPSResult = "win" | "loss" | "tie"

export const data = new SlashCommandBuilder()
  .setName("rps")
  .setDescription("Play Rock Paper Scissors against the bot - with optional betting!")
  .addStringOption((option) =>
    option
      .setName("choice")
      .setDescription("Your choice")
      .setRequired(true)
      .addChoices(
        { name: "🪨 Rock", value: "rock" },
        { name: "📄 Paper", value: "paper" },
        { name: "✂️ Scissors", value: "scissors" },
      ),
  )
  .addIntegerOption((option) =>
    option.setName("bet").setDescription("Amount to bet").setRequired(false).setMinValue(1).setMaxValue(1000000),
  )

export async function execute(interaction: ChatInputCommandInteraction) {
  try {
    const userChoice = interaction.options.getString("choice") as RPSChoice
    const betAmount = interaction.options.getInteger("bet")

    // Bot makes a choice
    const choices: RPSChoice[] = ["rock", "paper", "scissors"]
    const botChoice = choices[Math.floor(Math.random() * choices.length)]

    // Determine winner
    let result: RPSResult
    if (userChoice === botChoice) {
      result = "tie"
    } else if (
      (userChoice === "rock" && botChoice === "scissors") ||
      (userChoice === "paper" && botChoice === "rock") ||
      (userChoice === "scissors" && botChoice === "paper")
    ) {
      result = "win"
    } else {
      result = "loss"
    }

    // Handle betting if specified
    let isBetting = false
    let winnings = 0

    if (betAmount) {
      const betResult = await placeBet(interaction.user.id, interaction.user.username, betAmount, GAME_TYPES.RPS)
      if (!betResult.success) {
        return interaction.reply({ content: `❌ ${betResult.message}`, ephemeral: true })
      }

      isBetting = true
      if (result === "win") {
        winnings = betAmount * 2
      } else if (result === "tie") {
        winnings = betAmount // Refund on tie
      }

      if (result === "win" || result === "tie") {
        await processWin(interaction.user.id, interaction.user.username, betAmount, winnings, GAME_TYPES.RPS)
      }
    }

    // Record game and get stats
    await recordGame(interaction.user.id, interaction.user.username, result)
    const stats = await getPlayerStats(interaction.user.id)
    const economy = await getOrCreateUserEconomy(interaction.user.id, interaction.user.username)

    // Create embed
    const choiceEmojis = { rock: "🪨", paper: "📄", scissors: "✂️" }
    const resultTexts = { win: "🏆 You Win!", loss: "❌ You Lose!", tie: "🤝 It's a Tie!" }
    const resultColors = {
      win: botInfo.colors.success,
      loss: botInfo.colors.error,
      tie: botInfo.colors.primary,
    }

    const embed = new EmbedBuilder()
      .setTitle("Rock Paper Scissors")
      .setDescription(
        `${interaction.user.username} chose ${choiceEmojis[userChoice]} vs Bot's ${choiceEmojis[botChoice]}`,
      )
      .setColor(resultColors[result])
      .addFields({ name: "Result", value: resultTexts[result], inline: false })
      .setFooter({ text: `Played by ${interaction.user.username}` })
      .setTimestamp()

    // Add betting info if applicable
    if (isBetting) {
      if (result === "win") {
        embed.addFields(
          { name: "💰 Bet", value: `${betAmount!.toLocaleString()} coins`, inline: true },
          { name: "🎊 Winnings", value: `${winnings.toLocaleString()} coins`, inline: true },
        )
      } else if (result === "loss") {
        embed.addFields({ name: "💸 Lost", value: `${betAmount!.toLocaleString()} coins`, inline: true })
      } else {
        embed.addFields({ name: "🤝 Tie - Refunded", value: `${betAmount!.toLocaleString()} coins`, inline: true })
      }

      embed.addFields({ name: "💵 Balance", value: `${economy.balance.toLocaleString()} coins`, inline: true })
    }

    // Add stats if available
    if (stats && stats.totalGames > 0) {
      const winRate = ((stats.wins / stats.totalGames) * 100).toFixed(1)
      embed.addFields({
        name: "Your Stats",
        value: `W: ${stats.wins} | L: ${stats.losses} | T: ${stats.ties} | Rate: ${winRate}%`,
        inline: false,
      })
    }

    await interaction.reply({ embeds: [embed] })
  } catch (error) {
    logger.error("Error executing rps command:", error)
    await interaction.reply({ content: "There was an error while playing Rock Paper Scissors!", ephemeral: true })
  }
}
