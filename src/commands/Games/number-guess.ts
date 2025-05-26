import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  EmbedBuilder,
  type Message,
  type TextChannel,
} from "discord.js"
import { botInfo } from "../../utils/bot-info"
import { config } from "../../utils/config"

// Slash command definition
export const data = new SlashCommandBuilder().setName("number-guess").setDescription("Starts a number guessing game!")

// Slash command execution
export async function execute(interaction: ChatInputCommandInteraction) {
  const randomNumber = Math.floor(Math.random() * 100) + 1
  let guess: number | null = null
  let attempts = 0

  await interaction.reply({
    content: "I've picked a number between 1 and 100. Start guessing!",
    ephemeral: false,
  })

  // Type guard to ensure we have a text-based channel that supports message collection
  if (!interaction.channel || !("createMessageCollector" in interaction.channel)) {
    return interaction.followUp({
      content: "❌ This game cannot be played in this type of channel.",
      ephemeral: true,
    })
  }

  const filter = (m: Message) => m.author.id === interaction.user.id
  const collector = (interaction.channel as TextChannel).createMessageCollector({
    filter,
    time: 30000,
  })

  collector.on("collect", async (m: Message) => {
    attempts++
    guess = Number.parseInt(m.content)

    if (isNaN(guess)) {
      await interaction.followUp({
        content: "That's not a number! Try again.",
        ephemeral: true,
      })
      return
    }

    if (guess < randomNumber) {
      await interaction.followUp({
        content: "Too low! Guess higher.",
        ephemeral: true,
      })
    } else if (guess > randomNumber) {
      await interaction.followUp({
        content: "Too high! Guess lower.",
        ephemeral: true,
      })
    } else {
      const embed = new EmbedBuilder()
        .setTitle("🎉 Congratulations!")
        .setDescription(`You guessed the number **${randomNumber}** in ${attempts} attempts!`)
        .setColor(botInfo.colors.success)
        .setFooter({ text: `${config.botName} Number Guess` })
        .setTimestamp()

      await interaction.followUp({ embeds: [embed], ephemeral: false })
      collector.stop()
      return
    }

    if (attempts >= 10) {
      const embed = new EmbedBuilder()
        .setTitle("💀 Game Over!")
        .setDescription(`You ran out of attempts! The number was **${randomNumber}**.`)
        .setColor(botInfo.colors.error)
        .setFooter({ text: `${config.botName} Number Guess` })
        .setTimestamp()

      await interaction.followUp({ embeds: [embed], ephemeral: false })
      collector.stop()
    }
  })

  collector.on("end", async (collected) => {
    if (collected.size === 0 && guess === null) {
      const embed = new EmbedBuilder()
        .setTitle("⏰ Time's Up!")
        .setDescription("You didn't guess the number in time.")
        .setColor(botInfo.colors.warning)
        .setFooter({ text: `${config.botName} Number Guess` })
        .setTimestamp()

      await interaction.followUp({ embeds: [embed], ephemeral: false })
    }
  })
}
