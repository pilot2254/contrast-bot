import type { Message } from "discord.js"

// Prefix command definition
export const name = "server-list"
export const aliases = ["servers", "guilds"]
export const description = "List all servers the bot is in"
export const usage = ""
export const category = "Developer"

// Prefix command execution
export async function run(message: Message, _args: string[]) {
  try {
    const guilds = message.client.guilds.cache

    let response = `🏠 **Server List (${guilds.size} servers):**\n\n`

    const sortedGuilds = guilds.sort((a, b) => b.memberCount - a.memberCount)

    sortedGuilds.forEach((guild, index) => {
      const owner = guild.ownerId
      response += `**${index + 1}.** ${guild.name}\n`
      response += `   ID: ${guild.id}\n`
      response += `   Members: ${guild.memberCount}\n`
      response += `   Owner: <@${owner}>\n`
      response += `   Created: <t:${Math.floor(guild.createdTimestamp / 1000)}:R>\n\n`
    })

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
    await message.reply("❌ An error occurred while fetching the server list.")
  }
}
