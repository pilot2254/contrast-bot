import { type Message, EmbedBuilder } from "discord.js"
import { botInfo } from "../../utils/bot-info"
import { setMaintenanceMode, isMaintenanceMode } from "../../utils/blacklist-manager"
import { logger } from "../../utils/logger"
import { isDeveloper } from "../../utils/permissions"

// Prefix command definition
export const name = "maintenance"
export const aliases = ["maint"]
export const description = "Toggle maintenance mode"
export const usage = "[on/off]"

// Prefix command execution
export async function run(message: Message, args: string[]) {
  try {
    // Check if user is a developer
    if (!isDeveloper(message.author)) {
      return message.reply("You don't have permission to use this command!")
    }

    const currentMode = await isMaintenanceMode()
    let newMode = !currentMode

    if (args.length > 0) {
      const arg = args[0].toLowerCase()
      if (arg === "on" || arg === "enable" || arg === "true" || arg === "1") {
        newMode = true
      } else if (arg === "off" || arg === "disable" || arg === "false" || arg === "0") {
        newMode = false
      }
    }

    const success = await setMaintenanceMode(newMode)

    if (success) {
      const embed = new EmbedBuilder()
        .setTitle("Maintenance Mode")
        .setDescription(`Maintenance mode is now ${newMode ? "enabled" : "disabled"}.`)
        .setColor(newMode ? botInfo.colors.warning : botInfo.colors.success)
        .addFields({
          name: "Status",
          value: newMode ? "Only developers can use commands" : "All users can use commands",
        })
        .setTimestamp()

      await message.reply({ embeds: [embed] })
    } else {
      await message.reply("Failed to toggle maintenance mode!")
    }
  } catch (error) {
    logger.error("Error executing maintenance command:", error)
    await message.reply("There was an error while executing this command!")
  }
}
