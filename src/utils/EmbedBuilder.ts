import { EmbedBuilder as DiscordEmbedBuilder, type User } from "discord.js"
import { config } from "../config/config"

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

  static economy(): CustomEmbedBuilder {
    return new CustomEmbedBuilder("economy")
  }

  static gambling(): CustomEmbedBuilder {
    return new CustomEmbedBuilder("gambling")
  }

  static level(): CustomEmbedBuilder {
    return new CustomEmbedBuilder("level")
  }

  static success(): CustomEmbedBuilder {
    return new CustomEmbedBuilder("success")
  }

  static error(): CustomEmbedBuilder {
    return new CustomEmbedBuilder("error")
  }

  static warning(): CustomEmbedBuilder {
    return new CustomEmbedBuilder("warning")
  }

  static info(): CustomEmbedBuilder {
    return new CustomEmbedBuilder("info")
  }

  setUserAuthor(user: User): this {
    return this.setAuthor({
      name: user.tag,
      iconURL: user.displayAvatarURL(),
    })
  }

  formatCurrency(amount: number): string {
    return `${amount.toLocaleString()} ${config.economy.currency.symbol}`
  }
}
