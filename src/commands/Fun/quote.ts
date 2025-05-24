import { SlashCommandBuilder, type ChatInputCommandInteraction, EmbedBuilder } from "discord.js"
import { addQuote, getRandomQuote, getQuotesByUser } from "../../utils/quote-manager"
import { botInfo } from "../../utils/bot-info"

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
      .setName("user")
      .setDescription("Get quotes from a specific user")
      .addUserOption((option) => option.setName("user").setDescription("User to get quotes from").setRequired(true)),
  )

// Slash command execution
export async function execute(interaction: ChatInputCommandInteraction) {
  const subcommand = interaction.options.getSubcommand()

  try {
    switch (subcommand) {
      case "add": {
        const text = interaction.options.getString("text", true)
        const author = interaction.options.getUser("author") || interaction.user

        await addQuote(text, author.id, author.tag, interaction.guild?.id || null)

        await interaction.reply({
          content: `Quote added successfully! Attributed to ${author.tag}`,
          ephemeral: true,
        })
        break
      }

      case "random": {
        const quote = await getRandomQuote(interaction.guild?.id || null)

        if (!quote) {
          return interaction.reply({ content: "No quotes found!", ephemeral: true })
        }

        const embed = new EmbedBuilder()
          .setDescription(`"${quote.text}"`)
          .setFooter({ text: `— ${quote.authorTag}` })
          .setColor(botInfo.colors.primary)
          .setTimestamp(new Date(quote.createdAt))

        await interaction.reply({ embeds: [embed] })
        break
      }

      case "user": {
        const user = interaction.options.getUser("user", true)
        const quotes = await getQuotesByUser(user.id, interaction.guild?.id || null)

        if (quotes.length === 0) {
          return interaction.reply({ content: `No quotes found for ${user.tag}`, ephemeral: true })
        }

        const randomQuote = quotes[Math.floor(Math.random() * quotes.length)]

        const embed = new EmbedBuilder()
          .setDescription(`"${randomQuote.text}"`)
          .setFooter({ text: `— ${randomQuote.authorTag} (${quotes.length} total quotes)` })
          .setColor(botInfo.colors.primary)
          .setTimestamp(new Date(randomQuote.createdAt))

        await interaction.reply({ embeds: [embed] })
        break
      }
    }
  } catch (error) {
    await interaction.reply({ content: "An error occurred while processing the quote command.", ephemeral: true })
  }
}
