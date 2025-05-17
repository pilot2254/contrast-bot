import { SlashCommandBuilder, type ChatInputCommandInteraction, type Message, EmbedBuilder } from "discord.js"
import { botInfo } from "../utils/bot-info"

// Slash command definition
export const data = new SlashCommandBuilder()
  .setName("avatar")
  .setDescription("Shows a user's avatar")
  .addUserOption((option) => option.setName("user").setDescription("The user to show the avatar of").setRequired(false))

// Slash command execution
export async function execute(interaction: ChatInputCommandInteraction) {
  const user = interaction.options.getUser("user") || interaction.user
  const embed = createAvatarEmbed(user)
  await interaction.reply({ embeds: [embed] })
}

// Prefix command definition
export const name = "avatar"
export const aliases = ["av", "pfp"]
export const description = "Shows a user's avatar"
export const category = "Utility"
export const usage = "[user]"

// Prefix command execution
export async function run(message: Message, args: string[]) {
  let user = message.author

  if (args.length > 0) {
    const mentionedUser = message.mentions.users.first()
    if (mentionedUser) {
      user = mentionedUser
    } else {
      try {
        user = await message.client.users.fetch(args[0])
      } catch {
        // Try to find by username
        const username = args.join(" ").toLowerCase()
        const foundUser = message.guild?.members.cache.find(
          (member) =>
            member.user.username.toLowerCase() === username ||
            (member.nickname && member.nickname.toLowerCase() === username),
        )?.user

        if (foundUser) {
          user = foundUser
        } else {
          return message.reply("Could not find that user.")
        }
      }
    }
  }

  const embed = createAvatarEmbed(user)
  await message.reply({ embeds: [embed] })
}

// Helper function to create avatar embed
function createAvatarEmbed(user: any) {
  return new EmbedBuilder()
    .setTitle(`${user.username}'s Avatar`)
    .setColor(botInfo.colors.primary)
    .setImage(user.displayAvatarURL({ size: 4096 }))
    .setDescription(
      `[PNG](${user.displayAvatarURL({ size: 4096, extension: "png" })}) | [JPG](${user.displayAvatarURL({ size: 4096, extension: "jpg" })}) | [WEBP](${user.displayAvatarURL({ size: 4096, extension: "webp" })})`,
    )
    .setFooter({ text: `User ID: ${user.id}` })
    .setTimestamp()
}
