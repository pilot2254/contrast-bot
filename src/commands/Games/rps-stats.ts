import { SlashCommandBuilder, type ChatInputCommandInteraction, EmbedBuilder } from "discord.js"
import { getPlayerStats } from "../../utils/rps-manager"
import { botInfo } from "../../utils/bot-info"
import { config } from "../../utils/config"

// Slash command definition
export const data = new SlashCommandBuilder()
  .setName("rps-stats")
  .setDescription("Check Rock Paper Scissors statistics")
  .addUserOption((option) => option.setName("user").setDescription("User to check stats for").setRequired(false))

// Slash command execution
export async function execute(interaction: ChatInputCommandInteraction) {
  const targetUser = interaction.options.getUser("user") || interaction.user

  try {
    const stats = await getPlayerStats(targetUser.id)

    if (!stats || stats.totalGames === 0) {
      return interaction.reply({
        content: `${targetUser.id === interaction.user.id ? "You haven't" : `${targetUser.username} hasn't`} played any Rock Paper Scissors games yet!`,
        ephemeral: true,
      })
    }

    const winRate = ((stats.wins / stats.totalGames) * 100).toFixed(1)

    const embed = new EmbedBuilder()
      .setTitle(`🎮 ${targetUser.tag}'s RPS Statistics`)
      .setColor(botInfo.colors.primary)
      .setThumbnail(targetUser.displayAvatarURL())
      .addFields(
        { name: "🏆 Wins", value: stats.wins.toString(), inline: true },
        { name: "💀 Losses", value: stats.losses.toString(), inline: true },
        { name: "🤝 Ties", value: stats.ties.toString(), inline: true },
        { name: "📊 Total Games", value: stats.totalGames.toString(), inline: true },
        { name: "📈 Win Rate", value: `${winRate}%`, inline: true },
        { name: "🎯 Score", value: `${stats.wins - stats.losses}`, inline: true },
      )
      .setFooter({ text: config.botName })
      .setTimestamp()

    await interaction.reply({ embeds: [embed] })
  } catch (error) {
    await interaction.reply({ content: "An error occurred while fetching RPS statistics.", ephemeral: true })
  }
}
