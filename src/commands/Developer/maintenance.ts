import type { Message } from "discord.js"
import { setMaintenanceMode, isMaintenanceMode } from "../../utils/blacklist-manager"
import { config } from "../../utils/config"
import { sendWebhookAlert, WEBHOOK_COLORS } from "../../utils/webhook-alerts"

// Prefix command definition
export const name = "maintenance"
export const aliases = ["maint"]
export const description = "Toggle maintenance mode"
export const usage = "[on|off|status]"
export const category = "Developer"

// Prefix command execution
export async function run(message: Message, args: string[]) {
  const action = args[0]?.toLowerCase()

  try {
    if (!action || action === "status") {
      const status = await isMaintenanceMode()
      await message.reply(`🔧 ${config.botName} maintenance mode is currently **${status ? "ON" : "OFF"}**`)
      return
    }

    if (action === "on") {
      await setMaintenanceMode(true)
      await message.reply(
        `🔧 ${config.botName} maintenance mode has been **ENABLED**. Regular users cannot use commands.`,
      )

      // Send webhook alert
      await sendWebhookAlert({
        title: "🔧 Maintenance Mode Enabled",
        description: `${config.botName} has been put into maintenance mode`,
        color: WEBHOOK_COLORS.WARNING,
        fields: [
          { name: "Enabled By", value: `${message.author.tag} (${message.author.id})`, inline: true },
          { name: "Status", value: "Regular users cannot use commands", inline: true },
        ],
      })
    } else if (action === "off") {
      await setMaintenanceMode(false)
      await message.reply(
        `✅ ${config.botName} maintenance mode has been **DISABLED**. All users can use commands again.`,
      )

      // Send webhook alert
      await sendWebhookAlert({
        title: "✅ Maintenance Mode Disabled",
        description: `${config.botName} maintenance mode has been disabled`,
        color: WEBHOOK_COLORS.SUCCESS,
        fields: [
          { name: "Disabled By", value: `${message.author.tag} (${message.author.id})`, inline: true },
          { name: "Status", value: "All users can use commands again", inline: true },
        ],
      })
    } else {
      await message.reply("Invalid option. Use: `on`, `off`, or `status`")
    }
  } catch (error) {
    await message.reply("An error occurred while managing maintenance mode.")
  }
}
