import { SlashCommandBuilder, type ChatInputCommandInteraction, EmbedBuilder } from "discord.js"
import { getTopReputation } from "../../utils/reputation-manager"
import { botInfo } from "../../utils/bot-info"

// Slash command definition
export const data = new SlashCommandBuilder()
  .setName("rep-leaderboard")
  .setDescription("Shows the reputation leaderboard")
  .addIntegerOption((option) =>
    option
      .setName("limit")
      .setDescription("Number of users to show (1-20)")
      .setRequired(false)
      .setMinValue(1)
      .setMaxValue(20),
  )

// Slash command execution
export async function execute(interaction: ChatInputCommandInteraction) {
  const limit = interaction.options.getInteger("limit") || 10

  try {
    const topUsers = await getTopReputation(limit, interaction.guild?.id || null)

    if (topUsers.length === 0) {
      return interaction.reply({ content: "No reputation data found!", ephemeral: true })
    }

    const embed = new EmbedBuilder()
      .setTitle("🏆 Reputation Leaderboard")
      .setColor(botInfo.colors.primary)
      .setTimestamp()

    const description = topUsers
      .map((user, index) => {
        const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `${index + 1}.`
        return `${medal} **${user.userTag}** - ${user.points} points`
      })
      .join("\n")

    embed.setDescription(description)

    if (interaction.guild) {
      embed.setFooter({ text: `Server: ${interaction.guild.name}` })
    }

    await interaction.reply({ embeds: [embed] })
  } catch (error) {
    await interaction.reply({ content: "An error occurred while fetching the leaderboard.", ephemeral: true })
  }
}
