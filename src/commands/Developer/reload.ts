import type { Message } from "discord.js"
import { loadCommands } from "../../utils/command-loader"
import { logger } from "../../utils/logger"
import path from "path"
import { config } from "../../utils/config"
import { sendWebhookAlert, WEBHOOK_COLORS } from "../../utils/webhook-alerts"

// Prefix command definition
export const name = "reload"
export const aliases = ["rl"]
export const description = "Reload all commands"
export const usage = ""
export const category = "Developer"

// Prefix command execution
export async function run(message: Message, _args: string[]) {
  try {
    const commandsPath = path.join(__dirname, "..")
    const { commands, prefixCommands } = await loadCommands(commandsPath)

    // Update the client's command collections
    message.client.commands.clear()
    message.client.prefixCommands.clear()

    commands.forEach((command, name) => {
      message.client.commands.set(name, command)
    })

    prefixCommands.forEach((command, name) => {
      message.client.prefixCommands.set(name, command)
    })

    logger.info(`Reloaded ${commands.size} slash commands and ${prefixCommands.size} prefix commands`)
    await message.reply(
      `✅ Successfully reloaded ${commands.size} ${config.botName} slash commands and ${prefixCommands.size} prefix commands.`,
    )

    // Send webhook alert
    await sendWebhookAlert({
      title: "🔄 Commands Reloaded",
      description: `${config.botName} commands have been reloaded`,
      color: WEBHOOK_COLORS.INFO,
      fields: [
        { name: "Slash Commands", value: commands.size.toString(), inline: true },
        { name: "Prefix Commands", value: prefixCommands.size.toString(), inline: true },
        { name: "Reloaded By", value: `${message.author.tag} (${message.author.id})`, inline: true },
      ],
    })
  } catch (error) {
    logger.error("Error reloading commands:", error)
    await message.reply("❌ An error occurred while reloading commands.")
  }
}
