import {
  type ButtonInteraction,
  type ChatInputCommandInteraction,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  type EmbedBuilder,
  type InteractionReplyOptions,
} from "discord.js";

export class Pagination {
  private interaction: ChatInputCommandInteraction;
  private pages: EmbedBuilder[];
  private currentPage = 0;
  private timeout: number;
  private collector: any;
  private message: any;

  constructor(
    interaction: ChatInputCommandInteraction,
    pages: EmbedBuilder[],
    timeout = 60000,
  ) {
    this.interaction = interaction;
    this.pages = pages;
    this.timeout = timeout;
  }

  // Create pagination buttons
  private createButtons(
    currentPage: number,
    totalPages: number,
  ): ActionRowBuilder<ButtonBuilder> {
    const row = new ActionRowBuilder<ButtonBuilder>();

    // First page button
    row.addComponents(
      new ButtonBuilder()
        .setCustomId("first")
        .setLabel("⏮️")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(currentPage === 0),
    );

    // Previous page button
    row.addComponents(
      new ButtonBuilder()
        .setCustomId("previous")
        .setLabel("◀️")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(currentPage === 0),
    );

    // Page indicator
    row.addComponents(
      new ButtonBuilder()
        .setCustomId("page")
        .setLabel(`${currentPage + 1}/${totalPages}`)
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true),
    );

    // Next page button
    row.addComponents(
      new ButtonBuilder()
        .setCustomId("next")
        .setLabel("▶️")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(currentPage === totalPages - 1),
    );

    // Last page button
    row.addComponents(
      new ButtonBuilder()
        .setCustomId("last")
        .setLabel("⏭️")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(currentPage === totalPages - 1),
    );

    return row;
  }

  // Start pagination
  async start(): Promise<void> {
    if (this.pages.length === 0) {
      throw new Error("No pages to paginate");
    }

    if (this.pages.length === 1) {
      // If only one page, just send it without buttons
      await this.interaction.reply({ embeds: [this.pages[0]] });
      return;
    }

    // Send initial message with first page and buttons
    const row = this.createButtons(this.currentPage, this.pages.length);

    const replyOptions: InteractionReplyOptions = {
      embeds: [this.pages[this.currentPage]],
      components: [row],
    };

    this.message = await this.interaction.reply({
      ...replyOptions,
      fetchReply: true,
    });

    // Create collector for button interactions
    this.collector = this.message.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: this.timeout,
    });

    // Handle button interactions
    this.collector.on(
      "collect",
      async (buttonInteraction: ButtonInteraction) => {
        // Verify the user who clicked is the same who initiated
        if (buttonInteraction.user.id !== this.interaction.user.id) {
          await buttonInteraction.reply({
            content: "These buttons are not for you!",
            flags: [64], // EPHEMERAL flag
          });
          return;
        }

        // Handle button actions
        switch (buttonInteraction.customId) {
          case "first":
            this.currentPage = 0;
            break;
          case "previous":
            this.currentPage = Math.max(0, this.currentPage - 1);
            break;
          case "next":
            this.currentPage = Math.min(
              this.pages.length - 1,
              this.currentPage + 1,
            );
            break;
          case "last":
            this.currentPage = this.pages.length - 1;
            break;
          default:
            break;
        }

        // Update message with new page and buttons
        const newRow = this.createButtons(this.currentPage, this.pages.length);

        await buttonInteraction.update({
          embeds: [this.pages[this.currentPage]],
          components: [newRow],
        });
      },
    );

    // Handle collector end
    this.collector.on("end", async () => {
      // Remove buttons when collector ends
      try {
        await this.message.edit({
          components: [],
        });
      } catch (error) {
        // Message might have been deleted or no longer editable
      }
    });
  }

  // Stop pagination manually
  stop(): void {
    if (this.collector) {
      this.collector.stop();
    }
  }
}
