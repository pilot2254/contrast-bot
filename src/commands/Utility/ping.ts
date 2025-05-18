import { SlashCommandBuilder, type ChatInputCommandInteraction, type Message, EmbedBuilder } from "discord.js"
import { botInfo } from "../../utils/bot-info"

// Slash command definition
export const data = new SlashCommandBuilder().setName("ping").setDescription("Replies with bot latency")

// Slash command execution
export async function execute(interaction: ChatInputCommandInteraction) {
  const sent = await interaction.reply({ content: "Pinging...", fetchReply: true })
  const latency = sent.createdTimestamp - interaction.createdTimestamp
  const apiLatency = Math.round(interaction.client.ws.ping)

  const embed = new EmbedBuilder()
    .setTitle("🏓 Pong!")
    .setColor(botInfo.colors.primary)
    .addFields(
      { name: "Bot Latency", value: `${latency}ms`, inline: true },
      { name: "API Latency", value: `${apiLatency}ms`, inline: true },
    )
    .setFooter({ text: botInfo.name })
    .setTimestamp()

  await interaction.editReply({ content: null, embeds: [embed] })
}

// Prefix command definition
export const name = "ping"
export const aliases = ["latency", "pong"]
export const description = "Replies with bot latency"

// Prefix command execution
export async function run(message: Message, _args: string[]) {
  const sent = await message.reply("Pinging...")
  const latency = sent.createdTimestamp - message.createdTimestamp
  const apiLatency = Math.round(message.client.ws.ping)

  const embed = new EmbedBuilder()
    .setTitle("🏓 Pong!")
    .setColor(botInfo.colors.primary)
    .addFields(
      { name: "Bot Latency", value: `${latency}ms`, inline: true },
      { name: "API Latency", value: `${apiLatency}ms`, inline: true },
    )
    .setFooter({ text: botInfo.name })
    .setTimestamp()

  await sent.edit({ content: null, embeds: [embed] })
}
