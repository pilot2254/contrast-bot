import {
  EmbedBuilder,
  type TextChannel,
  codeBlock,
  type ChatInputCommandInteraction,
  type MessageComponentInteraction,
  type ModalSubmitInteraction,
  type AutocompleteInteraction,
  type CommandInteractionOption,
} from "discord.js"
import { config } from "../config/bot.config"
import type { ExtendedClient } from "../structures/ExtendedClient"

// A union of interaction types that ErrorHandler might deal with
type HandledInteraction =
  | ChatInputCommandInteraction
  | MessageComponentInteraction
  | ModalSubmitInteraction
  | AutocompleteInteraction

interface ErrorContext {
  interaction?: HandledInteraction
  commandName?: string
  interactionType?: string
  guildId?: string | null
  channelId?: string | null
  userId?: string | null
  options?: unknown
  timestamp?: string
  [key: string]: unknown // For other custom context properties
}

export class ErrorHandler {
  constructor(private client: ExtendedClient) {}

  async handle(error: Error, context?: ErrorContext): Promise<void> {
    const errorId = this.generateErrorId()
    const timestamp = new Date().toISOString()

    this.client.logger.error(`[${errorId}] ${error.message}`, {
      stack: error.stack,
      context: this.sanitizeContext(context),
      timestamp,
    })

    if (context?.interaction) {
      const interaction = context.interaction
      // Check if interaction can be replied to or followed up
      if ("replied" in interaction && "deferred" in interaction) {
        if (!interaction.replied && !interaction.deferred) {
          await this.sendUserErrorResponse(interaction, errorId)
        } else if (interaction.replied || interaction.deferred) {
          // Attempt to followUp if already replied/deferred
          try {
            const embed = this.createUserError(
              "An unexpected error occurred.",
              `Error ID: \`${errorId}\`\nPlease report this if the issue persists.`,
            )
            await interaction.followUp({ embeds: [embed], ephemeral: true })
          } catch (followUpError) {
            this.client.logger.error("Failed to send follow-up error response to user:", followUpError)
          }
        }
      }
    }

    if (config.logging.logErrors && process.env.ERROR_LOG_CHANNEL) {
      await this.logToErrorChannel(error, context, errorId, timestamp)
    }
    await this.storeErrorInDatabase(error, context, errorId, timestamp)
  }

  private generateErrorId(): string {
    return `ERR_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  }

  private sanitizeContext(context?: ErrorContext): Record<string, unknown> | null {
    if (!context) return null
    const sanitized: Record<string, unknown> = {}
    const safeProperties = ["commandName", "interactionType", "guildId", "channelId", "userId", "timestamp"]

    safeProperties.forEach((prop) => {
      if (context[prop] !== undefined) {
        sanitized[prop] = context[prop]
      }
    })

    if (context.interaction) {
      const interaction = context.interaction
      sanitized.interaction = {
        id: interaction.id,
        type: interaction.type,
        user: interaction.user?.id,
        guild: interaction.guild?.id,
        channel: interaction.channel?.id,
        commandName: "commandName" in interaction ? interaction.commandName : undefined,
      }

      // Handle command options safely
      if ("options" in interaction && interaction.options) {
        // For ChatInputCommandInteraction
        if ("data" in interaction.options && Array.isArray(interaction.options.data)) {
          sanitized.interaction_options = interaction.options.data.map((opt: CommandInteractionOption) => {
            const value = opt.value !== undefined ? opt.value : null
            return {
              name: opt.name,
              type: opt.type,
              value: typeof value === "string" && value.length > 100 ? "[TRUNCATED]" : value,
            }
          })
        }
      }
    }

    // Include other custom properties from context if they are not sensitive
    for (const key in context) {
      if (
        !safeProperties.includes(key) &&
        key !== "interaction" &&
        Object.prototype.hasOwnProperty.call(context, key)
      ) {
        // Basic check for sensitive data patterns (customize as needed)
        if (typeof context[key] === "string" && /(token|secret|password)/i.test(key)) {
          sanitized[key] = "[REDACTED]"
        } else {
          sanitized[key] = context[key]
        }
      }
    }
    return sanitized
  }

  private async sendUserErrorResponse(interaction: HandledInteraction, errorId: string): Promise<void> {
    try {
      const embed = this.createUserError(
        "An unexpected error occurred while processing your request.",
        `Error ID: \`${errorId}\`\nPlease report this to the developers if the issue persists.`,
      )
      if ("reply" in interaction) {
        // Check if interaction is repliable
        if ("replied" in interaction && (interaction.replied || interaction.deferred)) {
          await interaction.followUp({ embeds: [embed], ephemeral: true })
        } else {
          await interaction.reply({ embeds: [embed], ephemeral: true })
        }
      }
    } catch (replyError: unknown) {
      this.client.logger.error("Failed to send error response to user:", replyError)
    }
  }

  private async logToErrorChannel(
    error: Error,
    context: ErrorContext | undefined,
    errorId: string,
    timestamp: string,
  ): Promise<void> {
    try {
      if (!process.env.ERROR_LOG_CHANNEL) return

      const channel = (await this.client.channels.fetch(process.env.ERROR_LOG_CHANNEL)) as TextChannel | null
      if (!channel || !channel.isTextBased()) return

      const embed = new EmbedBuilder()
        .setColor(config.embeds.colors.error)
        .setTitle(`🚨 Error Report - ${errorId}`)
        .setDescription(`**Error:** ${error.message}`)
        .addFields(
          { name: "Stack Trace", value: codeBlock("js", this.truncateText(error.stack || "No stack trace", 1000)) },
          { name: "Timestamp", value: timestamp, inline: true },
        )
      if (context) {
        const contextString = JSON.stringify(this.sanitizeContext(context), null, 2)
        embed.addFields({ name: "Context", value: codeBlock("json", this.truncateText(contextString, 1000)) })
      }
      await channel.send({ embeds: [embed] })
    } catch (logError: unknown) {
      this.client.logger.error("Failed to log error to channel:", logError)
    }
  }

  private async storeErrorInDatabase(
    error: Error,
    context: ErrorContext | undefined,
    errorId: string,
    timestamp: string,
  ): Promise<void> {
    try {
      await this.client.database.run(
        `INSERT INTO error_logs (error_id, message, stack, context, timestamp) VALUES (?, ?, ?, ?, ?)`,
        [errorId, error.message, error.stack || null, JSON.stringify(this.sanitizeContext(context)), timestamp],
      )
    } catch (dbError: unknown) {
      this.client.logger.error("Failed to store error in database:", dbError)
    }
  }

  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength - 3) + "..."
  }

  createUserError(title: string, description?: string): EmbedBuilder {
    const embed = new EmbedBuilder().setColor(config.embeds.colors.error).setTitle(`❌ ${title}`).setTimestamp()

    if (description) {
      embed.setDescription(description)
    }

    if (config.embeds.footer.text) {
      embed.setFooter({
        text: config.embeds.footer.text,
        iconURL: config.embeds.footer.iconURL || undefined,
      })
    }

    return embed
  }

  createWarning(title: string, description?: string): EmbedBuilder {
    const embed = new EmbedBuilder().setColor(config.embeds.colors.warning).setTitle(`⚠️ ${title}`).setTimestamp()

    if (description) {
      embed.setDescription(description)
    }

    if (config.embeds.footer.text) {
      embed.setFooter({
        text: config.embeds.footer.text,
        iconURL: config.embeds.footer.iconURL || undefined,
      })
    }

    return embed
  }

  createInfo(title: string, description?: string): EmbedBuilder {
    const embed = new EmbedBuilder().setColor(config.embeds.colors.info).setTitle(`ℹ️ ${title}`).setTimestamp()

    if (description) {
      embed.setDescription(description)
    }

    if (config.embeds.footer.text) {
      embed.setFooter({
        text: config.embeds.footer.text,
        iconURL: config.embeds.footer.iconURL || undefined,
      })
    }

    return embed
  }

  createSuccess(title: string, description?: string): EmbedBuilder {
    const embed = new EmbedBuilder().setColor(config.embeds.colors.success).setTitle(`✅ ${title}`).setTimestamp()

    if (description) {
      embed.setDescription(description)
    }

    if (config.embeds.footer.text) {
      embed.setFooter({
        text: config.embeds.footer.text,
        iconURL: config.embeds.footer.iconURL || undefined,
      })
    }

    return embed
  }
}
