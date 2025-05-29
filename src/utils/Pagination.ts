import {
  type ButtonInteraction,
  type ChatInputCommandInteraction,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  type EmbedBuilder,
  type InteractionReplyOptions,
  type Message,
  type InteractionCollector, // Import InteractionCollector type
} from "discord.js"

export class Pagination {
  private interaction: ChatInputCommandInteraction
  private pages: EmbedBuilder[]
  private currentPage = 0
  private timeout: number
  private collector: InteractionCollector<ButtonInteraction> | null = null // Typed collector
  private message: Message | null = null // Typed message

  constructor(interaction: ChatInputCommandInteraction, pages: EmbedBuilder[], timeout = 60000) {
    this.interaction = interaction
    this.pages = pages
    this.timeout = timeout
  }

  private createButtons(currentPage: number, totalPages: number): ActionRowBuilder<ButtonBuilder> {
    const row = new ActionRowBuilder<ButtonBuilder>()

    // First page button
    row.addComponents(
      new ButtonBuilder()
        .setCustomId("first")
        .setLabel("⏮️")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(currentPage === 0),
    )

    // Previous page button
    row.addComponents(
      new ButtonBuilder()
        .setCustomId("previous")
        .setLabel("◀️")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(currentPage === 0),
    )

    // Page indicator
    row.addComponents(
      new ButtonBuilder()
        .setCustomId("page")
        .setLabel(`${currentPage + 1}/${totalPages}`)
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true),
    )

    // Next page button
    row.addComponents(
      new ButtonBuilder()
        .setCustomId("next")
        .setLabel("▶️")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(currentPage === totalPages - 1),
    )

    // Last page button
    row.addComponents(
      new ButtonBuilder()
        .setCustomId("last")
        .setLabel("⏭️")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(currentPage === totalPages - 1),
    )

    return row
  }

  async start(): Promise<void> {
    if (this.pages.length === 0) {
      await this.interaction.reply({ content: "There are no pages to display.", ephemeral: true })
      return
    }
    if (this.pages.length === 1) {
      await this.interaction.reply({ embeds: [this.pages[0]] })
      return
    }

    const row = this.createButtons(this.currentPage, this.pages.length)
    const replyOptions: InteractionReplyOptions = {
      embeds: [this.pages[this.currentPage]],
      components: [row],
      fetchReply: true, // Required to get the Message object
    }

    // Ensure interaction is repliable before attempting to reply
    if (!this.interaction.isRepliable()) {
      console.error("Pagination: Interaction is not repliable.") // Or handle more gracefully
      return
    }

    this.message = await this.interaction.reply(replyOptions)

    if (!this.message) {
      // Guard if reply somehow fails to return a message
      console.error("Pagination: Failed to get message object from reply.")
      return
    }

    this.collector = this.message.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: this.timeout,
    })

    this.collector.on("collect", async (buttonInteraction: ButtonInteraction) => {
      if (buttonInteraction.user.id !== this.interaction.user.id) {
        await buttonInteraction.reply({ content: "These buttons are not for you!", ephemeral: true })
        return
      }
      switch (buttonInteraction.customId) {
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
      const newRow = this.createButtons(this.currentPage, this.pages.length)
      await buttonInteraction.update({ embeds: [this.pages[this.currentPage]], components: [newRow] })
    })

    this.collector.on("end", async () => {
      if (this.message && this.message.editable) {
        // Check if message is still editable
        try {
          await this.message.edit({ components: [] })
        } catch (error: unknown) {
          // Log error if editing fails (e.g., message deleted)
          const client = this.interaction.client as any // Placeholder for ExtendedClient
          client.logger.warn("Pagination: Could not edit message on collector end:", error)
        }
      }
    })
  }

  stop(): void {
    if (this.collector && !this.collector.ended) {
      this.collector.stop()
    }
  }
}
