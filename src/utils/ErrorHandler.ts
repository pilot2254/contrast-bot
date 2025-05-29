import { EmbedBuilder, type TextChannel, codeBlock } from "discord.js"
import { config } from "../config/bot.config"
import type { ExtendedClient } from "../structures/ExtendedClient"

export class ErrorHandler {
  constructor(private client: ExtendedClient) {}

  /**
   * Handle an error with comprehensive context and logging
   */
  async handle(error: Error, context?: any): Promise<void> {
    const errorId = this.generateErrorId()
    const timestamp = new Date().toISOString()

    // Enhanced error logging
    this.client.logger.error(`[${errorId}] ${error.message}`, {
      stack: error.stack,
      context: this.sanitizeContext(context),
      timestamp,
    })

    // Respond to user if interaction context exists
    if (context?.interaction && !context.interaction.replied && !context.interaction.deferred) {
      await this.sendUserErrorResponse(context.interaction, errorId)
    }

    // Log to error channel if configured
    if (config.logging.logErrors && process.env.ERROR_LOG_CHANNEL) {
      await this.logToErrorChannel(error, context, errorId, timestamp)
    }

    // Store error in database for analytics
    await this.storeErrorInDatabase(error, context, errorId, timestamp)
  }

  /**
   * Generate a unique error ID for tracking
   */
  private generateErrorId(): string {
    return `ERR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Sanitize context to remove sensitive information
   */
  private sanitizeContext(context: any): any {
    if (!context) return null

    const sanitized: any = {}

    // Safe properties to include
    const safeProperties = ["commandName", "interactionType", "guildId", "channelId", "userId", "options", "timestamp"]

    safeProperties.forEach((prop) => {
      if (context[prop] !== undefined) {
        sanitized[prop] = context[prop]
      }
    })

    // Extract interaction data safely
    if (context.interaction) {
      sanitized.interaction = {
        commandName: context.interaction.commandName,
        type: context.interaction.type,
        user: context.interaction.user?.id,
        guild: context.interaction.guild?.id,
        channel: context.interaction.channel?.id,
      }

      if (context.interaction.options?.data) {
        sanitized.interaction.options = context.interaction.options.data.map((opt: any) => ({
          name: opt.name,
          type: opt.type,
          value: typeof opt.value === "string" && opt.value.length > 100 ? "[TRUNCATED]" : opt.value,
        }))
      }
    }

    return sanitized
  }

  /**
   * Send error response to user
   */
  private async sendUserErrorResponse(interaction: any, errorId: string): Promise<void> {
    try {
      const embed = this.createUserError(
        "An unexpected error occurred while processing your request.",
        `Error ID: \`${errorId}\`\nPlease report this to the developers if the issue persists.`,
      )

      await interaction.reply({
        embeds: [embed],
        ephemeral: true,
      })
    } catch (replyError) {
      this.client.logger.error("Failed to send error response to user:", replyError)
    }
  }

  /**
   * Log error to designated error channel
   */
  private async logToErrorChannel(error: Error, context: any, errorId: string, timestamp: string): Promise<void> {
    try {
      const channel = (await this.client.channels.fetch(process.env.ERROR_LOG_CHANNEL!)) as TextChannel
      if (!channel) return

      const embed = new EmbedBuilder()
        .setColor(config.embeds.colors.error)
        .setTitle(`🚨 Error Report - ${errorId}`)
        .setDescription(`**Error:** ${error.message}`)
        .addFields(
          {
            name: "Stack Trace",
            value: codeBlock("js", this.truncateText(error.stack || "No stack trace", 1000)),
          },
          {
            name: "Timestamp",
            value: timestamp,
            inline: true,
          },
        )

      if (context) {
        const contextString = JSON.stringify(this.sanitizeContext(context), null, 2)
        embed.addFields({
          name: "Context",
          value: codeBlock("json", this.truncateText(contextString, 1000)),
        })
      }

      await channel.send({ embeds: [embed] })
    } catch (logError) {
      this.client.logger.error("Failed to log error to channel:", logError)
    }
  }

  /**
   * Store error in database for analytics
   */
  private async storeErrorInDatabase(error: Error, context: any, errorId: string, timestamp: string): Promise<void> {
    try {
      await this.client.database.run(
        `INSERT INTO error_logs (error_id, message, stack, context, timestamp) 
         VALUES (?, ?, ?, ?, ?)`,
        [errorId, error.message, error.stack, JSON.stringify(this.sanitizeContext(context)), timestamp],
      )
    } catch (dbError) {
      this.client.logger.error("Failed to store error in database:", dbError)
    }
  }

  /**
   * Truncate text to specified length
   */
  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength - 3) + "..."
  }

  /**
   * Create a user-facing error embed
   */
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

  /**
   * Create a warning embed
   */
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

  /**
   * Create an info embed
   */
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

  /**
   * Create a success embed
   */
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
