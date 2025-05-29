import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js"
import { ReputationService } from "../../services/ReputationService"
import { CustomEmbedBuilder } from "../../utils/EmbedBuilder"
import { Pagination } from "../../utils/Pagination"
import type { ExtendedClient } from "../../structures/ExtendedClient"
import type { Command } from "../../types/Command"

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("rep-leaderboard")
    .setDescription("View the reputation leaderboard")
    .addStringOption((option) =>
      option
        .setName("type")
        .setDescription("Leaderboard type")
        .setRequired(true)
        .addChoices({ name: "Given", value: "given" }, { name: "Received", value: "received" }),
    ),
  category: "social",
  cooldown: 3,
  async execute(interaction: ChatInputCommandInteraction, client: ExtendedClient) {
    const type = interaction.options.getString("type")! as "given" | "received"
    const reputationService = new ReputationService(client)

    const topUsers = await reputationService.getReputationLeaderboard(type, 50)

    if (topUsers.length === 0) {
      const embed = CustomEmbedBuilder.info().setDescription("No users found in the leaderboard yet.")
      await interaction.reply({ embeds: [embed] })
      return
    }

    // Create pages (10 users per page)
    const pages: any[] = []
    const usersPerPage = 10

    for (let i = 0; i < topUsers.length; i += usersPerPage) {
      const pageUsers = topUsers.slice(i, i + usersPerPage)
      const embed = CustomEmbedBuilder.info()
        .setTitle(`📊 Reputation Leaderboard - ${type.charAt(0).toUpperCase() + type.slice(1)}`)
        .setDescription(`Top users by reputation ${type}`)

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

          description += `**${rank}.** ${username} - ${user.count} reputation\n`
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
  },
}

export default command
