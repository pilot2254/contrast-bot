import { SlashCommandBuilder, type ChatInputCommandInteraction, EmbedBuilder } from "discord.js"
import { giveReputation, getReputation } from "../../utils/reputation-manager"
import { botInfo } from "../../utils/bot-info"

// Slash command definition
export const data = new SlashCommandBuilder()
  .setName("rep")
  .setDescription("Manage user reputation")
  .addSubcommand((subcommand) =>
    subcommand
      .setName("give")
      .setDescription("Give reputation to a user")
      .addUserOption((option) => option.setName("user").setDescription("User to give reputation to").setRequired(true))
      .addStringOption((option) =>
        option.setName("reason").setDescription("Reason for giving reputation").setRequired(false),
      ),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("check")
      .setDescription("Check reputation of a user")
      .addUserOption((option) =>
        option.setName("user").setDescription("User to check reputation for").setRequired(false),
      ),
  )

// Slash command execution
export async function execute(interaction: ChatInputCommandInteraction) {
  const subcommand = interaction.options.getSubcommand()

  try {
    switch (subcommand) {
      case "give": {
        const targetUser = interaction.options.getUser("user", true)
        const reason = interaction.options.getString("reason") || "No reason provided"

        if (targetUser.id === interaction.user.id) {
          return interaction.reply({ content: "You cannot give reputation to yourself!", ephemeral: true })
        }

        if (targetUser.bot) {
          return interaction.reply({ content: "You cannot give reputation to bots!", ephemeral: true })
        }

        const result = await giveReputation(
          interaction.user.id,
          targetUser.id,
          targetUser.tag,
          reason,
          interaction.guild?.id || null,
        )

        if (!result.success) {
          return interaction.reply({ content: result.message, ephemeral: true })
        }

        const embed = new EmbedBuilder()
          .setTitle("Reputation Given!")
          .setDescription(`${targetUser.tag} now has **${result.newReputation}** reputation points`)
          .addFields({ name: "Reason", value: reason })
          .setColor(botInfo.colors.success)
          .setTimestamp()

        await interaction.reply({ embeds: [embed] })
        break
      }

      case "check": {
        const targetUser = interaction.options.getUser("user") || interaction.user
        const reputation = await getReputation(targetUser.id, interaction.guild?.id || null)

        const embed = new EmbedBuilder()
          .setTitle(`${targetUser.tag}'s Reputation`)
          .setDescription(`**${reputation.points}** reputation points`)
          .addFields(
            { name: "Reputation Given", value: reputation.given.toString(), inline: true },
            { name: "Reputation Received", value: reputation.received.toString(), inline: true },
          )
          .setColor(botInfo.colors.primary)
          .setThumbnail(targetUser.displayAvatarURL())
          .setTimestamp()

        await interaction.reply({ embeds: [embed] })
        break
      }
    }
  } catch (error) {
    await interaction.reply({ content: "An error occurred while processing the reputation command.", ephemeral: true })
  }
}
