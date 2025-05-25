import { SlashCommandBuilder, type ChatInputCommandInteraction, EmbedBuilder } from "discord.js"
import { botInfo } from "../../utils/bot-info"
import { getUserLevel, getLevelProgress, getUserRank } from "../../utils/level-manager"

export const data = new SlashCommandBuilder()
  .setName("level")
  .setDescription("Check your or another user's level")
  .addUserOption((option) => option.setName("user").setDescription("The user to check level for").setRequired(false))

export async function execute(interaction: ChatInputCommandInteraction) {
  const targetUser = interaction.options.getUser("user") || interaction.user

  try {
    // Get user level data
    const userLevel = await getUserLevel(targetUser.id, targetUser.username)

    // Get user rank
    const rank = await getUserRank(targetUser.id)

    // Get progress to next level
    const progress = getLevelProgress(userLevel.xp, userLevel.level)

    // Create progress bar
    const progressBar = createProgressBar(progress.progressPercent)

    // Create embed
    const embed = new EmbedBuilder()
      .setTitle(`${targetUser.username}'s Level`)
      .setColor(botInfo.colors.primary)
      .setThumbnail(targetUser.displayAvatarURL({ size: 256 }))
      .addFields(
        { name: "Level", value: `${userLevel.level}`, inline: true },
        { name: "Rank", value: `#${rank}`, inline: true },
        { name: "Total XP", value: `${userLevel.xp.toLocaleString()}`, inline: true },
        {
          name: "Progress to Level " + (userLevel.level + 1),
          value: `${progressBar}\n${progress.currentLevelXp.toLocaleString()} / ${progress.nextLevelXp.toLocaleString()} XP (${progress.progressPercent}%)`,
          inline: false,
        },
        {
          name: "XP Needed",
          value: `${progress.xpNeeded.toLocaleString()} more XP needed for next level`,
          inline: false,
        },
      )
      .setFooter({ text: "Earn XP by using commands, playing games, and more!" })
      .setTimestamp()

    // Add stats if it's the user checking their own level
    if (targetUser.id === interaction.user.id) {
      embed.addFields(
        { name: "Commands Used", value: userLevel.totalCommandsUsed.toLocaleString(), inline: true },
        { name: "Games Played", value: userLevel.totalGamesPlayed.toLocaleString(), inline: true },
        { name: "Games Won", value: userLevel.totalGamesWon.toLocaleString(), inline: true },
        {
          name: "Win Rate",
          value:
            userLevel.totalGamesPlayed > 0
              ? `${((userLevel.totalGamesWon / userLevel.totalGamesPlayed) * 100).toFixed(1)}%`
              : "N/A",
          inline: true,
        },
        {
          name: "Total Bet",
          value: `${userLevel.totalBetAmount.toLocaleString()} coins`,
          inline: true,
        },
      )
    }

    await interaction.reply({ embeds: [embed] })
  } catch (error) {
    await interaction.reply({
      content: "Failed to retrieve level information. Please try again later.",
      ephemeral: true,
    })
  }
}

// Helper function to create a progress bar
function createProgressBar(percent: number): string {
  const filledChar = "█"
  const emptyChar = "░"
  const barLength = 20

  const filledLength = Math.round((percent / 100) * barLength)
  const emptyLength = barLength - filledLength

  return filledChar.repeat(filledLength) + emptyChar.repeat(emptyLength)
}
