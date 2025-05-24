import { SlashCommandBuilder, type ChatInputCommandInteraction, EmbedBuilder } from "discord.js"
import { givePositiveRep, getUserReputation } from "../../utils/reputation-manager"
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

        const result = await givePositiveRep(
          interaction.user.id,
          interaction.user.username,
          targetUser.id,
          targetUser.username,
        )

        if (!result.success) {
          return interaction.reply({ content: result.message, ephemeral: true })
        }

        const embed = new EmbedBuilder()
          .setTitle("Reputation Given!")
          .setDescription(result.message)
          .setColor(botInfo.colors.success)
          .setTimestamp()

        await interaction.reply({ embeds: [embed] })
        break
      }

      case "check": {
        const targetUser = interaction.options.getUser("user") || interaction.user
        const reputation = await getUserReputation(targetUser.id)

        if (!reputation) {
          return interaction.reply({
            content: `${targetUser.id === interaction.user.id ? "You don't" : `${targetUser.username} doesn't`} have any reputation yet.`,
            ephemeral: true,
          })
        }

        const total = reputation.receivedPositive - reputation.receivedNegative

        const embed = new EmbedBuilder()
          .setTitle(`${targetUser.tag}'s Reputation`)
          .setDescription(`**${total}** total reputation`)
          .addFields(
            { name: "Positive", value: reputation.receivedPositive.toString(), inline: true },
            { name: "Negative", value: reputation.receivedNegative.toString(), inline: true },
            { name: "Given", value: reputation.givenPositive.toString(), inline: true },
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
