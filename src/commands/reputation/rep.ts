import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js"
import { ReputationService } from "../../services/ReputationService"
import { CustomEmbedBuilder } from "../../utils/EmbedBuilder"
import type { ExtendedClient } from "../../structures/ExtendedClient"
import type { Command } from "../../types/Command"

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("rep")
    .setDescription("Manage reputation points")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("give")
        .setDescription("Give reputation to a user")
        .addUserOption((option) =>
          option.setName("user").setDescription("The user to give reputation to").setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("take")
        .setDescription("Take reputation from a user")
        .addUserOption((option) =>
          option.setName("user").setDescription("The user to take reputation from").setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("check")
        .setDescription("Check reputation points")
        .addUserOption((option) => option.setName("user").setDescription("The user to check").setRequired(false)),
    ),
  category: "social",
  cooldown: 3,
  async execute(interaction: ChatInputCommandInteraction, client: ExtendedClient) {
    const subcommand = interaction.options.getSubcommand()
    const reputationService = new ReputationService(client)

    switch (subcommand) {
      case "give":
        await handleRepGive(interaction, client, reputationService)
        break
      case "take":
        await handleRepTake(interaction, client, reputationService)
        break
      case "check":
        await handleRepCheck(interaction, client, reputationService)
        break
    }
  },
}

// Handle rep give
async function handleRepGive(
  interaction: ChatInputCommandInteraction,
  client: ExtendedClient,
  reputationService: ReputationService,
) {
  const targetUser = interaction.options.getUser("user")!

  if (targetUser.bot) {
    const errorEmbed = client.errorHandler.createUserError("You cannot give reputation to a bot.")
    await interaction.reply({ embeds: [errorEmbed], ephemeral: true })
    return
  }

  try {
    await reputationService.giveReputation(interaction.user.id, targetUser.id)

    const embed = CustomEmbedBuilder.success()
      .setTitle("Reputation Given")
      .setDescription(`You gave reputation to ${targetUser.toString()}!`)
      .setFooter({ text: "You can give reputation to this user again in 24 hours" })

    await interaction.reply({ embeds: [embed] })
  } catch (error: any) {
    const errorEmbed = client.errorHandler.createUserError(error.message)
    await interaction.reply({ embeds: [errorEmbed], ephemeral: true })
  }
}

// Handle rep take
async function handleRepTake(
  interaction: ChatInputCommandInteraction,
  client: ExtendedClient,
  reputationService: ReputationService,
) {
  const targetUser = interaction.options.getUser("user")!

  if (targetUser.bot) {
    const errorEmbed = client.errorHandler.createUserError("You cannot take reputation from a bot.")
    await interaction.reply({ embeds: [errorEmbed], ephemeral: true })
    return
  }

  try {
    await reputationService.takeReputation(interaction.user.id, targetUser.id)

    const embed = CustomEmbedBuilder.warning()
      .setTitle("Reputation Taken")
      .setDescription(`You took reputation from ${targetUser.toString()}.`)
      .setFooter({ text: "You can affect this user's reputation again in 24 hours" })

    await interaction.reply({ embeds: [embed] })
  } catch (error: any) {
    const errorEmbed = client.errorHandler.createUserError(error.message)
    await interaction.reply({ embeds: [errorEmbed], ephemeral: true })
  }
}

// Handle rep check
async function handleRepCheck(
  interaction: ChatInputCommandInteraction,
  client: ExtendedClient,
  reputationService: ReputationService,
) {
  const targetUser = interaction.options.getUser("user") || interaction.user
  const reputation = await reputationService.getUserReputation(targetUser.id)

  const embed = CustomEmbedBuilder.info()
    .setTitle(`${targetUser.id === interaction.user.id ? "Your" : `${targetUser.username}'s`} Reputation`)
    .setThumbnail(targetUser.displayAvatarURL())
    .addFields(
      {
        name: "⬆️ Given",
        value: reputation.given.toString(),
        inline: true,
      },
      {
        name: "⬇️ Received",
        value: reputation.received.toString(),
        inline: true,
      },
      {
        name: "📊 Net Reputation",
        value: (reputation.received - reputation.given).toString(),
        inline: true,
      },
    )

  await interaction.reply({ embeds: [embed] })
}

export default command
