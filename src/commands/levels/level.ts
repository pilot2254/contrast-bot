import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type EmbedBuilder,
} from "discord.js"
import { LevelingService } from "../../services/LevelingService"
import { CustomEmbedBuilder } from "../../utils/EmbedBuilder"
import { Pagination } from "../../utils/Pagination"
import type { ExtendedClient } from "../../structures/ExtendedClient"
import type { Command } from "../../types/Command"

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("level")
    .setDescription("Check your level or view the leaderboard")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("check")
        .setDescription("Check your level or another user's level")
        .addUserOption((option) =>
          option
            .setName("user")
            .setDescription("The user to check")
            .setRequired(false)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("leaderboard")
        .setDescription("View the top users by level")
    ),
  category: "levels",
  cooldown: 3,
  async execute(
    interaction: ChatInputCommandInteraction,
    client: ExtendedClient
  ) {
    const subcommand = interaction.options.getSubcommand()
    const levelingService = new LevelingService(client)

    if (subcommand === "check") {
      await handleLevelCheck(interaction, client, levelingService)
    } else if (subcommand === "leaderboard") {
      await handleLevelLeaderboard(interaction, client, levelingService)
    }
  },
}

// Handle level check
async function handleLevelCheck(
  interaction: ChatInputCommandInteraction,
  client: ExtendedClient,
  levelingService: LevelingService
) {
  const targetUser = interaction.options.getUser("user") || interaction.user
  const { level, xp, requiredXP } = await levelingService.getUserLevel(
    targetUser.id
  )

  // Calculate progress percentage - ensure it's between 0 and 100
  let progress = Math.floor((xp / requiredXP) * 100)
  progress = Math.max(0, Math.min(100, progress)) // Clamp between 0 and 100

  // Create progress bar
  const progressBar = createProgressBar(progress)

  const embed = CustomEmbedBuilder.level()
    .setTitle(
      `${targetUser.id === interaction.user.id ? "Your" : `${targetUser.username}'s`} Level`
    )
    .setThumbnail(targetUser.displayAvatarURL())
    .addFields(
      {
        name: "📊 Level",
        value: level.toString(),
        inline: true,
      },
      {
        name: "✨ XP",
        value: `${xp.toLocaleString()} / ${requiredXP.toLocaleString()}`,
        inline: true,
      },
      {
        name: "📈 Progress",
        value: `${progressBar} ${progress}%`,
        inline: false,
      }
    )

  await interaction.reply({ embeds: [embed] })
}

// Handle level leaderboard
async function handleLevelLeaderboard(
  interaction: ChatInputCommandInteraction,
  client: ExtendedClient,
  levelingService: LevelingService
) {
  const topUsers = await levelingService.getLevelLeaderboard(50) // Get top 50 for pagination

  if (topUsers.length === 0) {
    const embed = CustomEmbedBuilder.info().setDescription(
      "No users found in the leaderboard yet."
    )
    await interaction.reply({ embeds: [embed] })
    return
  }

  // Create pages (10 users per page)
  const pages: EmbedBuilder[] = []
  const usersPerPage = 10

  for (let i = 0; i < topUsers.length; i += usersPerPage) {
    const pageUsers = topUsers.slice(i, i + usersPerPage)
    const embed = CustomEmbedBuilder.level()
      .setTitle("📊 Level Leaderboard")
      .setDescription("The highest level users on the server")

    let description = ""
    for (let j = 0; j < pageUsers.length; j++) {
      const user = pageUsers[j]
      const rank = i + j + 1

      try {
        // Try to fetch user, use ID if not found
        let username
        try {
          const discordUser = await client.users.fetch(user.user_id)
          username = discordUser.username
        } catch {
          username = `User ${user.user_id}`
        }

        description += `**${rank}.** ${username} - Level ${user.level} (${user.xp.toLocaleString()} XP)\n`
      } catch (error) {
        client.logger.error(`Error fetching user for leaderboard: ${error}`)
      }
    }

    embed.setDescription(description)
    embed.setFooter({
      text: `Page ${Math.floor(i / usersPerPage) + 1} of ${Math.ceil(topUsers.length / usersPerPage)}`,
    })
    pages.push(embed)
  }

  // Use pagination if multiple pages
  if (pages.length > 1) {
    const pagination = new Pagination(interaction, pages)
    await pagination.start()
  } else {
    await interaction.reply({ embeds: [pages[0]] })
  }
}

// Create visual progress bar - fixed to handle edge cases
function createProgressBar(percentage: number): string {
  // Ensure percentage is between 0 and 100
  const clampedPercentage = Math.max(0, Math.min(100, percentage))

  // Calculate filled and empty segments
  const filled = Math.floor(clampedPercentage / 10)
  const empty = Math.max(0, 10 - filled) // Ensure empty is never negative

  return "█".repeat(filled) + "░".repeat(empty)
}

export default command
