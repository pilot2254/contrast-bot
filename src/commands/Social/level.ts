import { SlashCommandBuilder, type ChatInputCommandInteraction, EmbedBuilder } from "discord.js"
import { getUserLevel, calculateLevelFromXp, getLevelProgress, getUserRank } from "../../utils/level-manager"
import { botInfo } from "../../utils/bot-info"
import { config } from "../../utils/config"

export const data = new SlashCommandBuilder()
  .setName("level")
  .setDescription("Check your level and XP")
  .addUserOption((option) => option.setName("user").setDescription("User to check level for").setRequired(false))

export async function execute(interaction: ChatInputCommandInteraction) {
  const targetUser = interaction.options.getUser("user") || interaction.user

  try {
    const userLevel = await getUserLevel(targetUser.id, targetUser.username)
    const currentLevel = calculateLevelFromXp(userLevel.xp)
    const progress = getLevelProgress(userLevel.xp, currentLevel)

    // Create progress bar
    const progressBarLength = 20
    const filledBars = Math.round((progress.progressPercent / 100) * progressBarLength)
    const emptyBars = progressBarLength - filledBars
    const progressBar = "█".repeat(filledBars) + "░".repeat(emptyBars)

    const embed = new EmbedBuilder()
      .setTitle(`📊 Level Stats - ${targetUser.username}`)
      .setColor(botInfo.colors.primary)
      .setThumbnail(targetUser.displayAvatarURL())
      .addFields(
        { name: "🏆 Level", value: currentLevel.toString(), inline: true },
        { name: "⭐ Total XP", value: userLevel.xp.toLocaleString(), inline: true },
        { name: "📈 Rank", value: `#${(await getUserRank(targetUser.id)) || "N/A"}`, inline: true },
        {
          name: "📊 Progress to Next Level",
          value: `${progressBar}\n${progress.currentLevelXp.toLocaleString()}/${progress.nextLevelXp.toLocaleString()} XP (${progress.progressPercent}%)`,
          inline: false,
        },
      )
      .setFooter({ text: `${config.botName} • Global Level System` })
      .setTimestamp()

    // Add activity stats if available
    if (userLevel.totalCommandsUsed > 0 || userLevel.totalGamesPlayed > 0) {
      const winRate =
        userLevel.totalGamesPlayed > 0 ? Math.round((userLevel.totalGamesWon / userLevel.totalGamesPlayed) * 100) : 0
      embed.addFields({
        name: "🎮 Activity Stats",
        value: `Commands: ${userLevel.totalCommandsUsed} | Games: ${userLevel.totalGamesPlayed} | Win Rate: ${winRate}%`,
        inline: false,
      })
    }

    await interaction.reply({ embeds: [embed] })
  } catch (error) {
    await interaction.reply({ content: "❌ An error occurred while fetching level data.", ephemeral: true })
  }
}
