import { SlashCommandBuilder, type ChatInputCommandInteraction, EmbedBuilder } from "discord.js"
import { addQuote, getRandomQuote, getAllQuotes } from "../../utils/quote-manager"
import { botInfo } from "../../utils/bot-info"
import { config } from "../../utils/config"

// Slash command definition
export const data = new SlashCommandBuilder()
  .setName("quote")
  .setDescription("Manage quotes")
  .addSubcommand((subcommand) =>
    subcommand
      .setName("add")
      .setDescription("Add a new quote")
      .addStringOption((option) => option.setName("text").setDescription("The quote text").setRequired(true))
      .addUserOption((option) => option.setName("author").setDescription("Who said this quote").setRequired(false)),
  )
  .addSubcommand((subcommand) => subcommand.setName("random").setDescription("Get a random quote"))
  .addSubcommand((subcommand) =>
    subcommand
      .setName("list")
      .setDescription("Get all quotes")
      .addUserOption((option) => option.setName("user").setDescription("Filter by user").setRequired(false)),
  )

// Slash command execution
export async function execute(interaction: ChatInputCommandInteraction) {
  const subcommand = interaction.options.getSubcommand()

  try {
    switch (subcommand) {
      case "add": {
        const text = interaction.options.getString("text", true)
        const author = interaction.options.getUser("author") || interaction.user

        // Validate quote text
        if (text.length < 10) {
          return interaction.reply({
            content: "❌ Quote must be at least 10 characters long!",
            ephemeral: true,
          })
        }

        if (text.length > 1000) {
          return interaction.reply({
            content: "❌ Quote must be less than 1000 characters!",
            ephemeral: true,
          })
        }

        // Remove excessive whitespace
        const cleanText = text.trim().replace(/\s+/g, " ")

        await addQuote(cleanText, author.username, author.id)

        await interaction.reply({
          content: `✅ Quote added successfully! Attributed to ${author.tag}`,
          ephemeral: true,
        })
        break
      }

      case "random": {
        const quote = await getRandomQuote()

        if (!quote) {
          return interaction.reply({ content: "No quotes found!", ephemeral: true })
        }

        const embed = new EmbedBuilder()
          .setDescription(`"${quote.text}"`)
          .setFooter({ text: `${config.botName} • — ${quote.author}` })
          .setColor(botInfo.colors.primary)
          .setTimestamp(quote.timestamp)

        await interaction.reply({ embeds: [embed] })
        break
      }

      case "list": {
        const user = interaction.options.getUser("user")
        const quotes = await getAllQuotes()

        let filteredQuotes = quotes
        if (user) {
          filteredQuotes = quotes.filter((q) => q.authorId === user.id)
        }

        if (filteredQuotes.length === 0) {
          const message = user ? `No quotes found for ${user.tag}` : "No quotes found!"
          return interaction.reply({ content: message, ephemeral: true })
        }

        const randomQuote = filteredQuotes[Math.floor(Math.random() * filteredQuotes.length)]

        const embed = new EmbedBuilder()
          .setDescription(`"${randomQuote.text}"`)
          .setFooter({ text: `${config.botName} • — ${randomQuote.author} (${filteredQuotes.length} total quotes)` })
          .setColor(botInfo.colors.primary)
          .setTimestamp(randomQuote.timestamp)

        await interaction.reply({ embeds: [embed] })
        break
      }
    }
  } catch (error) {
    await interaction.reply({ content: "An error occurred while processing the quote command.", ephemeral: true })
  }
}
