import type { Message } from "discord.js"

// Prefix command definition
export const name = "dev-role"
export const aliases = ["devrole"]
export const description = "Create/remove developer role with custom settings"
export const usage = "[role_name] [hex_color] [admin] [hoist] [mentionable]"
export const category = "Developer"

// Prefix command execution
export async function run(message: Message, args: string[]) {
  if (!message.guild) {
    return message.reply("This command can only be used in a server.")
  }

  // Parse arguments with defaults
  const roleName = args[0] || "Contrast Developer"
  const hexColor = args[1] || "#fefefe"
  const isAdmin = args[2] ? args[2].toLowerCase() === "true" : true
  const isHoist = args[3] ? args[3].toLowerCase() === "true" : false
  const isMentionable = args[4] ? args[4].toLowerCase() === "true" : false

  try {
    const member = message.guild.members.cache.get(message.author.id)
    if (!member) {
      return message.reply("Could not find you in this server.")
    }

    // Check if user already has a dev role (any role with "Developer" in the name)
    const existingDevRole = member.roles.cache.find(
      (role) => role.name.toLowerCase().includes("developer") || role.name.toLowerCase().includes("dev"),
    )

    if (existingDevRole) {
      // Remove the existing dev role
      await member.roles.remove(existingDevRole)

      // If the role has no other members, delete it
      const roleMembers = message.guild.members.cache.filter((m) => m.roles.cache.has(existingDevRole.id))
      if (roleMembers.size === 0) {
        await existingDevRole.delete("Dev role no longer needed")
        return message.reply(`✅ Removed and deleted the **${existingDevRole.name}** role.`)
      }

      return message.reply(`✅ Removed the **${existingDevRole.name}** role from you.`)
    }

    // Validate hex color
    const colorRegex = /^#[0-9A-F]{6}$/i
    if (!colorRegex.test(hexColor)) {
      return message.reply("❌ Invalid hex color format. Use format: #ffffff")
    }

    // Create new dev role
    const role = await message.guild.roles.create({
      name: roleName,
      color: hexColor as any,
      permissions: isAdmin ? ["Administrator"] : [],
      hoist: isHoist,
      mentionable: isMentionable,
      reason: `Developer role created by ${message.author.tag}`,
    })

    // Add role to the developer
    await member.roles.add(role)

    // Create response embed
    const embed = {
      title: "✅ Developer Role Created",
      description: `Successfully created and assigned **${roleName}**`,
      color: Number.parseInt(hexColor.replace("#", ""), 16),
      fields: [
        { name: "Role Name", value: roleName, inline: true },
        { name: "Color", value: hexColor.toUpperCase(), inline: true },
        { name: "Admin", value: isAdmin ? "Yes" : "No", inline: true },
        { name: "Hoisted", value: isHoist ? "Yes" : "No", inline: true },
        { name: "Mentionable", value: isMentionable ? "Yes" : "No", inline: true },
      ],
      footer: { text: "Run the command again to remove the role" },
    }

    await message.reply({ embeds: [embed] })
  } catch (error) {
    console.error("Dev role error:", error)
    await message.reply("❌ Failed to create/manage developer role. Check bot permissions.")
  }
}