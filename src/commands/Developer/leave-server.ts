import type { Message, TextChannel } from "discord.js"

// Prefix command definition
export const name = "leave-server"
export const aliases = ["leave", "exit-server"]
export const description = "Make the bot leave a specific server"
export const usage = "<server_id>"
export const category = "Developer"

// Prefix command execution
export async function run(message: Message, args: string[]) {
  if (args.length === 0) {
    return message.reply(`Usage: \`${name} ${usage}\``)
  }

  const serverId = args[0]

  try {
    const guild = message.client.guilds.cache.get(serverId)

    if (!guild) {
      return message.reply("❌ Server not found or bot is not in that server.")
    }

    const serverName = guild.name
    const memberCount = guild.memberCount

    // Confirm before leaving
    await message.reply(
      `⚠️ Are you sure you want to leave **${serverName}** (${memberCount} members)?\nReply with \`yes\` to confirm or \`no\` to cancel.`,
    )

    const filter = (m: Message) => m.author.id === message.author.id && ["yes", "no"].includes(m.content.toLowerCase())

    // Type guard to ensure we have a text-based channel
    if (!message.channel || !("awaitMessages" in message.channel)) {
      return message.reply("❌ This command cannot be used in this type of channel.")
    }

    const collected = await (message.channel as TextChannel).awaitMessages({ filter, max: 1, time: 30000 })

    if (!collected.size) {
      return message.reply("❌ Confirmation timed out. Server leave cancelled.")
    }

    const confirmation = collected.first()!.content.toLowerCase()

    if (confirmation === "yes") {
      await guild.leave()
      await message.reply(`✅ Successfully left **${serverName}**`)
    } else {
      await message.reply("❌ Server leave cancelled.")
    }
  } catch (error) {
    await message.reply("❌ An error occurred while trying to leave the server.")
  }
}
