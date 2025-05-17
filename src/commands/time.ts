import { SlashCommandBuilder, type ChatInputCommandInteraction, type Message, EmbedBuilder } from "discord.js"
import { botInfo } from "../utils/bot-info"

export const data = new SlashCommandBuilder()
  .setName("time")
  .setDescription("Returns the current time as a Discord timestamp")

export async function execute(interaction: ChatInputCommandInteraction) {
  const currentTimestamp = Math.floor(Date.now() / 1000)

  const embed = new EmbedBuilder()
    .setTitle("Current Time")
    .setColor(botInfo.colors.primary)
    .addFields(
      { name: "Short Time", value: `<t:${currentTimestamp}:t>`, inline: true },
      { name: "Code", value: `\`<t:${currentTimestamp}:t>\``, inline: true },
    )
    .setFooter({ text: "Copy the code to use this timestamp in your messages" })
    .setTimestamp()

  await interaction.reply({ embeds: [embed] })
}

export const name = "time"
export const aliases = ["timestamp", "now"]
export const description = "Returns the current time as a Discord timestamp"
export const category = "Utility"

export async function run(message: Message, args: string[]) {
  const currentTimestamp = Math.floor(Date.now() / 1000)

  const embed = new EmbedBuilder()
    .setTitle("Current Time")
    .setColor(botInfo.colors.primary)
    .addFields(
      { name: "Short Time", value: `<t:${currentTimestamp}:t>`, inline: true },
      { name: "Code", value: `\`<t:${currentTimestamp}:t>\``, inline: true },
    )
    .setFooter({ text: "Copy the code to use this timestamp in your messages" })
    .setTimestamp()

  await message.reply({ embeds: [embed] })
}
