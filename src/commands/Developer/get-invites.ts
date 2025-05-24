import type { Message } from "discord.js"

// Prefix command definition
export const name = "get-invites"
export const aliases = ["invites", "inv"]
export const description = "Get invite links for all servers the bot is in"
export const usage = ""
export const category = "Developer"

// Prefix command execution
export async function run(message: Message, args: string[]) {
  try {
    const guilds = message.client.guilds.cache

    let response = `🔗 **Server Invites (${guilds.size} servers):**\n\n`

    for (const [guildId, guild] of guilds) {
      try {
        // Try to get an existing invite first
        const invites = await guild.invites.fetch().catch(() => null)
        let invite = invites?.first() || null

        // If no existing invite, try to create one
        if (!invite) {
          const channels = guild.channels.cache.filter((c) => c.type === 0) // Text channels
          const firstChannel = channels.first()

          if (firstChannel && firstChannel.permissionsFor(guild.members.me!)?.has("CreateInstantInvite")) {
            invite = await firstChannel
              .createInvite({
                maxAge: 0, // Never expires
                maxUses: 0, // Unlimited uses
                reason: "Developer invite request",
              })
              .catch(() => null)
          }
        }

        if (invite) {
          response += `**${guild.name}** (${guild.memberCount} members)\n${invite.url}\n\n`
        } else {
          response += `**${guild.name}** (${guild.memberCount} members)\n❌ Cannot create invite\n\n`
        }
      } catch (error) {
        response += `**${guild.name}** (${guild.memberCount} members)\n❌ Error getting invite\n\n`
      }
    }

    // Split message if too long
    if (response.length > 2000) {
      const chunks = response.match(/[\s\S]{1,2000}/g) || []
      for (const chunk of chunks) {
        await message.reply(chunk)
      }
    } else {
      await message.reply(response)
    }
  } catch (error) {
    await message.reply("❌ An error occurred while fetching invites.")
  }
}
