import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type EmbedBuilder,
  type ChatInputCommandInteraction,
  type MessageComponentInteraction,
  ComponentType,
} from "discord.js"

export class Pagination {
  private interaction: ChatInputCommandInteraction
  private pages: EmbedBuilder[]
  private currentPage: number
  private timeout: number

  constructor(interaction: ChatInputCommandInteraction, pages: EmbedBuilder[], timeout = 60000) {
    this.interaction = interaction
    this.pages = pages
    this.currentPage = 0
    this.timeout = timeout
  }

  public async start(): Promise<void> {
    if (this.pages.length === 1) {
      await this.interaction.reply({ embeds: [this.pages[0]] })
      return
    }

    const row = this.createButtonRow()
    const message = await this.interaction.reply({
      embeds: [this.pages[this.currentPage]],
      components: [row],
      fetchReply: true,
    })

    const collector = message.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: this.timeout,
    })

    collector.on("collect", async (i: MessageComponentInteraction) => {
      if (i.user.id !== this.interaction.user.id) {
        await i.reply({
          content: "These buttons aren't for you!",
          ephemeral: true,
        })
        return
      }

      switch (i.customId) {
        case "first":
          this.currentPage = 0
          break
        case "previous":
          this.currentPage = Math.max(0, this.currentPage - 1)
          break
        case "next":
          this.currentPage = Math.min(this.pages.length - 1, this.currentPage + 1)
          break
        case "last":
          this.currentPage = this.pages.length - 1
          break
      }

      await i.update({
        embeds: [this.pages[this.currentPage]],
        components: [this.createButtonRow()],
      })
    })

    collector.on("end", async () => {
      const disabledRow = this.createButtonRow(true)
      try {
        await this.interaction.editReply({ components: [disabledRow] })
      } catch {
        // Interaction might have been deleted
      }
    })
  }

  private createButtonRow(disabled = false): ActionRowBuilder<ButtonBuilder> {
    const first = new ButtonBuilder()
      .setCustomId("first")
      .setEmoji("⏮️")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(disabled || this.currentPage === 0)

    const previous = new ButtonBuilder()
      .setCustomId("previous")
      .setEmoji("◀️")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(disabled || this.currentPage === 0)

    const next = new ButtonBuilder()
      .setCustomId("next")
      .setEmoji("▶️")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(disabled || this.currentPage === this.pages.length - 1)

    const last = new ButtonBuilder()
      .setCustomId("last")
      .setEmoji("⏭️")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(disabled || this.currentPage === this.pages.length - 1)

    return new ActionRowBuilder<ButtonBuilder>().addComponents(first, previous, next, last)
  }
}
