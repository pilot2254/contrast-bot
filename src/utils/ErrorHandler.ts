import { EmbedBuilder, type TextChannel, type User, type Guild, codeBlock } from "discord.js"
import { config } from "../config/bot.config"
import type { ExtendedClient } from "../structures/ExtendedClient"

export class ErrorHandler {
  constructor(private client: ExtendedClient) {}

  /**
   * Handle an error with context
   */
  async handle(error: Error, context?: any): Promise<void> {
    // Log the error
    this.client.logger.error(error.message, error.stack)

    // Format context for logging
    const contextInfo = this.formatErrorContext(context)

    // If there's an interaction context, respond to the user
    if (context?.interaction) {
      const embed = this.createUserError("Something went wrong while processing your request.")

      try {
        if (context.interaction.deferred || context.interaction.replied) {
          await context.interaction.editReply({ embeds: [embed] }).catch(() => {})
        } else {
          await context.interaction.reply({ embeds: [embed], ephemeral: true }).catch(() => {})
        }
      } catch (replyError) {
        this.client.logger.error("Failed to send error message:", replyError)
      }
    }

    // Log to error channel if configured
    if (process.env.ERROR_LOG_CHANNEL) {
      try {
        const channel = (await this.client.channels.fetch(process.env.ERROR_LOG_CHANNEL)) as TextChannel
        if (channel) {
          const errorEmbed = new EmbedBuilder()
            .setColor(config.embeds.colors.error)
            .setTitle("Error Report")
            .setDescription(`**Error:** ${error.message}`)
            .addFields({
              name: "Stack Trace",
              value: codeBlock("js", error.stack?.substring(0, 1000) || "No stack trace available"),
            })

          if (contextInfo) {
            errorEmbed.addFields({
              name: "Context",
              value: codeBlock("json", contextInfo.substring(0, 1000)),
            })
          }

          errorEmbed.setTimestamp()

          await channel.send({ embeds: [errorEmbed] }).catch(() => {})
        }
      } catch (logError) {
        this.client.logger.error("Failed to log error to channel:", logError)
      }
    }
  }

  /**
   * Format error context for logging
   */
  private formatErrorContext(context: any): string {
    if (!context) return "No context provided"

    try {
      const formattedContext: Record<string, any> = {}

      // Extract useful information from context
      if (context.interaction) {
        const interaction = context.interaction
        formattedContext.interactionType = interaction.type
        formattedContext.commandName = interaction.commandName

        if (interaction.options) {
          formattedContext.options = {}
          interaction.options.data.forEach((opt: any) => {
            formattedContext.options[opt.name] = opt.value
          })
        }

        if (interaction.user) {
          formattedContext.user = this.formatUser(interaction.user)
        }

        if (interaction.guild) {
          formattedContext.guild = this.formatGuild(interaction.guild)
        }
      }

      // Add any other context properties
      Object.keys(context).forEach((key) => {
        if (key !== "interaction" && key !== "client") {
          formattedContext[key] = context[key]
        }
      })

      return JSON.stringify(formattedContext, null, 2)
    } catch (err) {
      return "Error formatting context"
    }
  }

  /**
   * Format user information for error logs
   */
  private formatUser(user: User): Record<string, any> {
    return {
      id: user.id,
      tag: user.tag,
      bot: user.bot,
    }
  }

  /**
   * Format guild information for error logs
   */
  private formatGuild(guild: Guild): Record<string, any> {
    return {
      id: guild.id,
      name: guild.name,
      memberCount: guild.memberCount,
    }
  }

  /**
   * Create a user-facing error embed
   */
  createUserError(message: string): EmbedBuilder {
    return new EmbedBuilder()
      .setColor(config.embeds.colors.error)
      .setTitle("❌ Error")
      .setDescription(message)
      .setTimestamp()
  }

  /**
   * Create a warning embed
   */
  createWarning(message: string): EmbedBuilder {
    return new EmbedBuilder()
      .setColor(config.embeds.colors.warning)
      .setTitle("⚠️ Warning")
      .setDescription(message)
      .setTimestamp()
  }
}
