import { SlashCommandBuilder, type ChatInputCommandInteraction, type Message, EmbedBuilder } from "discord.js"
import { botInfo } from "../../utils/bot-info"
import { addQuote, getQuoteById, getRandomQuote } from "../../utils/quote-manager"

// Slash command definition
export const data = new SlashCommandBuilder()
  .setName("quote")
  .setDescription("Manages quotes")
  .addSubcommand((subcommand) =>
    subcommand
      .setName("add")
      .setDescription("Adds a new quote")
      .addStringOption((option) => option.setName("text").setDescription("The quote text").setRequired(true)),
  )
  .addSubcommand((subcommand) => subcommand.setName("random").setDescription("Gets a random quote"))
  .addSubcommand((subcommand) =>
    subcommand
      .setName("get")
      .setDescription("Gets a quote by ID")
      .addIntegerOption((option) =>
        option.setName("id").setDescription("The ID of the quote to get").setRequired(true).setMinValue(1),
      ),
  )

// Slash command execution
export async function execute(interaction: ChatInputCommandInteraction) {
  const subcommand = interaction.options.getSubcommand()

  if (subcommand === "add") {
    const text = interaction.options.getString("text", true)
    const author = interaction.user.username
    const authorId = interaction.user.id

    const quote = await addQuote(text, author, authorId)

    const embed = new EmbedBuilder()
      .setTitle("Quote Added")
      .setDescription(quote.text)
      .setColor(botInfo.colors.success)
      .addFields(
        { name: "Quote ID", value: `#${quote.id}`, inline: true },
        { name: "Added by", value: quote.author, inline: true },
      )
      .setFooter({ text: `Use /quote get ${quote.id} to see this quote again` })
      .setTimestamp()

    await interaction.reply({ embeds: [embed] })
  } else if (subcommand === "random") {
    const quote = await getRandomQuote()

    if (!quote) {
      return interaction.reply({
        content: "No quotes have been added yet. Add one with `/quote add`!",
        ephemeral: true,
      })
    }

    const embed = new EmbedBuilder()
      .setTitle(`Quote #${quote.id}`)
      .setDescription(quote.text)
      .setColor(botInfo.colors.primary)
      .addFields({ name: "Added by", value: quote.author, inline: true })
      .setFooter({ text: `Quote #${quote.id}` })
      .setTimestamp(quote.timestamp)

    await interaction.reply({ embeds: [embed] })
  } else if (subcommand === "get") {
    const id = interaction.options.getInteger("id", true)
    const quote = await getQuoteById(id)

    if (!quote) {
      return interaction.reply({
        content: `Quote #${id} not found.`,
        ephemeral: true,
      })
    }

    const embed = new EmbedBuilder()
      .setTitle(`Quote #${quote.id}`)
      .setDescription(quote.text)
      .setColor(botInfo.colors.primary)
      .addFields({ name: "Added by", value: quote.author, inline: true })
      .setFooter({ text: `Quote #${quote.id}` })
      .setTimestamp(quote.timestamp)

    await interaction.reply({ embeds: [embed] })
  }
}

// Prefix command definition
export const name = "quote"
export const aliases = ["quotes", "q"]
export const description = "Manages quotes"
export const usage = "add <text> | random | <id>"

// Prefix command execution
export async function run(message: Message, args: string[]) {
  if (!args.length) {
    return message.reply(`Usage: ${usage}`)
  }

  const subcommand = args[0].toLowerCase()

  if (subcommand === "add") {
    if (args.length < 2) {
      return message.reply("Please provide the quote text.")
    }

    const text = args.slice(1).join(" ")
    const author = message.author.username
    const authorId = message.author.id

    const quote = await addQuote(text, author, authorId)

    const embed = new EmbedBuilder()
      .setTitle("Quote Added")
      .setDescription(quote.text)
      .setColor(botInfo.colors.success)
      .addFields(
        { name: "Quote ID", value: `#${quote.id}`, inline: true },
        { name: "Added by", value: quote.author, inline: true },
      )
      .setFooter({ text: `Use ?quote ${quote.id} to see this quote again` })
      .setTimestamp()

    await message.reply({ embeds: [embed] })
  } else if (subcommand === "random") {
    const quote = await getRandomQuote()

    if (!quote) {
      return message.reply("No quotes have been added yet. Add one with `?quote add`!")
    }

    const embed = new EmbedBuilder()
      .setTitle(`Quote #${quote.id}`)
      .setDescription(quote.text)
      .setColor(botInfo.colors.primary)
      .addFields({ name: "Added by", value: quote.author, inline: true })
      .setFooter({ text: `Quote #${quote.id}` })
      .setTimestamp(quote.timestamp)

    await message.reply({ embeds: [embed] })
  } else {
    // Try to parse the subcommand as a quote ID
    const id = Number.parseInt(subcommand)

    if (isNaN(id)) {
      return message.reply(`Unknown subcommand. Usage: ${usage}`)
    }

    const quote = await getQuoteById(id)

    if (!quote) {
      return message.reply(`Quote #${id} not found.`)
    }

    const embed = new EmbedBuilder()
      .setTitle(`Quote #${quote.id}`)
      .setDescription(quote.text)
      .setColor(botInfo.colors.primary)
      .addFields({ name: "Added by", value: quote.author, inline: true })
      .setFooter({ text: `Quote #${quote.id}` })
      .setTimestamp(quote.timestamp)

    await message.reply({ embeds: [embed] })
  }
}
