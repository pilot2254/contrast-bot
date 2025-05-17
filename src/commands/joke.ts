import { SlashCommandBuilder, type ChatInputCommandInteraction, type Message, EmbedBuilder } from "discord.js"
import { botInfo } from "../utils/bot-info"

// Collection of clean jokes
const jokes = [
  "Why don't scientists trust atoms? Because they make up everything!",
  "I told my wife she was drawing her eyebrows too high. She looked surprised.",
  "What do you call a fake noodle? An impasta!",
  "Why did the scarecrow win an award? Because he was outstanding in his field!",
  "I'm reading a book about anti-gravity. It's impossible to put down!",
  "Did you hear about the mathematician who's afraid of negative numbers? He'll stop at nothing to avoid them.",
  "Why don't skeletons fight each other? They don't have the guts.",
  "What's the best thing about Switzerland? I don't know, but the flag is a big plus.",
  "I used to be a baker, but I couldn't make enough dough.",
  "Parallel lines have so much in common. It's a shame they'll never meet.",
  "Why did the bicycle fall over? Because it was two tired!",
  "How do you organize a space party? You planet!",
  "What do you call a parade of rabbits hopping backwards? A receding hare-line.",
  "Why did the invisible man turn down the job offer? He couldn't see himself doing it.",
  "What's orange and sounds like a parrot? A carrot.",
  "How do you make a tissue dance? Put a little boogie in it!",
  "What did one wall say to the other wall? I'll meet you at the corner!",
  "Why don't eggs tell jokes? They'd crack each other up.",
  "I'm on a seafood diet. Every time I see food, I eat it.",
  "What do you call a bear with no teeth? A gummy bear!",
]

// Slash command definition
export const data = new SlashCommandBuilder().setName("joke").setDescription("Tells a random joke")

// Slash command execution
export async function execute(interaction: ChatInputCommandInteraction) {
  const randomJoke = jokes[Math.floor(Math.random() * jokes.length)]

  const embed = new EmbedBuilder()
    .setTitle("Here's a joke for you")
    .setDescription(randomJoke)
    .setColor(botInfo.colors.primary)
    .setFooter({ text: `Requested by ${interaction.user.tag}` })
    .setTimestamp()

  await interaction.reply({ embeds: [embed] })
}

// Prefix command definition
export const name = "joke"
export const aliases = ["jokes", "funny"]
export const description = "Tells a random joke"
export const category = "Fun"

// Prefix command execution
export async function run(message: Message, args: string[]) {
  const randomJoke = jokes[Math.floor(Math.random() * jokes.length)]

  const embed = new EmbedBuilder()
    .setTitle("Here's a joke for you")
    .setDescription(randomJoke)
    .setColor(botInfo.colors.primary)
    .setFooter({ text: `Requested by ${message.author.tag}` })
    .setTimestamp()

  await message.reply({ embeds: [embed] })
}
