import { SlashCommandBuilder, type ChatInputCommandInteraction, EmbedBuilder } from "discord.js"
import { getOrCreateUserSafe, depositToSafe, withdrawFromSafe } from "../../utils/safe-manager"
import { getOrCreateUserEconomy } from "../../utils/economy-manager"
import { botInfo } from "../../utils/bot-info"
import { config } from "../../utils/config"

export const data = new SlashCommandBuilder()
  .setName("safe")
  .setDescription("Manage your secure safe storage")
  .addSubcommand((subcommand) => subcommand.setName("status").setDescription("Check your safe status and capacity"))
  .addSubcommand((subcommand) =>
    subcommand
      .setName("deposit")
      .setDescription("Deposit coins into your safe")
      .addIntegerOption((option) =>
        option.setName("amount").setDescription("Amount to deposit").setRequired(true).setMinValue(1),
      ),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("withdraw")
      .setDescription("Withdraw coins from your safe")
      .addIntegerOption((option) =>
        option.setName("amount").setDescription("Amount to withdraw").setRequired(true).setMinValue(1),
      ),
  )

export async function execute(interaction: ChatInputCommandInteraction) {
  const subcommand = interaction.options.getSubcommand()

  try {
    switch (subcommand) {
      case "status": {
        const safe = await getOrCreateUserSafe(interaction.user.id, interaction.user.username)
        const economy = await getOrCreateUserEconomy(interaction.user.id, interaction.user.username)

        const usedCapacity = (safe.balance / safe.capacity) * 100
        const availableSpace = safe.capacity - safe.balance

        const embed = new EmbedBuilder()
          .setTitle("🔒 Your Safe Status")
          .setColor(botInfo.colors.primary)
          .setThumbnail(interaction.user.displayAvatarURL())
          .addFields(
            { name: "💰 Wallet Balance", value: `${economy.balance.toLocaleString()} coins`, inline: true },
            { name: "🔒 Safe Balance", value: `${safe.balance.toLocaleString()} coins`, inline: true },
            {
              name: "📊 Total Wealth",
              value: `${(economy.balance + safe.balance).toLocaleString()} coins`,
              inline: true,
            },
            { name: "🏦 Safe Capacity", value: `${safe.capacity.toLocaleString()} coins`, inline: true },
            { name: "📈 Used Capacity", value: `${usedCapacity.toFixed(1)}%`, inline: true },
            { name: "💾 Available Space", value: `${availableSpace.toLocaleString()} coins`, inline: true },
          )
          .setDescription(
            "Your safe protects your coins from all-in gambling losses!\n" +
              "💡 **Tip:** Upgrade your safe capacity in `/shop list`",
          )
          .setFooter({ text: `${config.botName} • Safe created` })
          .setTimestamp(safe.createdAt)

        await interaction.reply({ embeds: [embed] })
        break
      }

      case "deposit": {
        const amount = interaction.options.getInteger("amount", true)
        const result = await depositToSafe(interaction.user.id, interaction.user.username, amount)

        if (!result.success) {
          return interaction.reply({ content: `❌ ${result.message}`, ephemeral: true })
        }

        const safe = await getOrCreateUserSafe(interaction.user.id, interaction.user.username)
        const economy = await getOrCreateUserEconomy(interaction.user.id, interaction.user.username)

        const embed = new EmbedBuilder()
          .setTitle("🔒 Deposit Successful")
          .setDescription(result.message)
          .setColor(botInfo.colors.success)
          .addFields(
            { name: "💰 Wallet Balance", value: `${economy.balance.toLocaleString()} coins`, inline: true },
            { name: "🔒 Safe Balance", value: `${safe.balance.toLocaleString()} coins`, inline: true },
            { name: "💸 Deposited", value: `${amount.toLocaleString()} coins`, inline: true },
          )
          .setFooter({ text: config.botName })
          .setTimestamp()

        await interaction.reply({ embeds: [embed] })
        break
      }

      case "withdraw": {
        const amount = interaction.options.getInteger("amount", true)
        const result = await withdrawFromSafe(interaction.user.id, interaction.user.username, amount)

        if (!result.success) {
          return interaction.reply({ content: `❌ ${result.message}`, ephemeral: true })
        }

        const safe = await getOrCreateUserSafe(interaction.user.id, interaction.user.username)
        const economy = await getOrCreateUserEconomy(interaction.user.id, interaction.user.username)

        const embed = new EmbedBuilder()
          .setTitle("🔓 Withdrawal Successful")
          .setDescription(result.message)
          .setColor(botInfo.colors.success)
          .addFields(
            { name: "💰 Wallet Balance", value: `${economy.balance.toLocaleString()} coins`, inline: true },
            { name: "🔒 Safe Balance", value: `${safe.balance.toLocaleString()} coins`, inline: true },
            { name: "💵 Withdrawn", value: `${amount.toLocaleString()} coins`, inline: true },
          )
          .setFooter({ text: config.botName })
          .setTimestamp()

        await interaction.reply({ embeds: [embed] })
        break
      }
    }
  } catch (error) {
    await interaction.reply({
      content: "❌ An error occurred while processing your safe request.",
      ephemeral: true,
    })
  }
}
