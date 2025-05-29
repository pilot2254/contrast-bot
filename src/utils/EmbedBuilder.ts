import { EmbedBuilder as DiscordEmbedBuilder, type User } from "discord.js"
import { config } from "../config/bot.config"

export class CustomEmbedBuilder extends DiscordEmbedBuilder {
  constructor(type: keyof typeof config.embeds.colors = "primary") {
    super()
    this.setColor(config.embeds.colors[type])
    this.setTimestamp()

    if (config.embeds.footer.text) {
      this.setFooter({
        text: config.embeds.footer.text,
        iconURL: config.embeds.footer.iconURL || undefined,
      })
    }
  }

  // Economy embed
  static economy(): CustomEmbedBuilder {
    return new CustomEmbedBuilder("economy")
  }

  // Gambling embed
  static gambling(): CustomEmbedBuilder {
    return new CustomEmbedBuilder("gambling")
  }

  // Level embed
  static level(): CustomEmbedBuilder {
    return new CustomEmbedBuilder("level")
  }

  // Success embed
  static success(): CustomEmbedBuilder {
    return new CustomEmbedBuilder("success")
  }

  // Error embed
  static error(): CustomEmbedBuilder {
    return new CustomEmbedBuilder("error")
  }

  // Warning embed
  static warning(): CustomEmbedBuilder {
    return new CustomEmbedBuilder("warning")
  }

  // Info embed
  static info(): CustomEmbedBuilder {
    return new CustomEmbedBuilder("info")
  }

  // Add author from Discord user
  setUserAuthor(user: User): this {
    return this.setAuthor({
      name: user.tag,
      iconURL: user.displayAvatarURL(),
    })
  }

  // Format currency
  formatCurrency(amount: number): string {
    return `${amount.toLocaleString()} ${config.economy.currency.symbol}`
  }
}
