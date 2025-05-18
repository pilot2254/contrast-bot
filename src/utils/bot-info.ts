import { config } from "./config"
import { version as discordJsVersion } from "discord.js"
import { version as nodeVersion } from "process"

// Package.json information
const packageInfo = {
  version: process.env.npm_package_version || "1.0.0",
  name: process.env.npm_package_name || "contrast-bot",
}

export const botInfo = {
  name: config.botName,
  version: packageInfo.version,
  description: "A versatile Discord bot built with TypeScript and Discord.js",

  // Technical information
  technical: {
    discordJs: discordJsVersion,
    node: nodeVersion,
  },

  // Links
  links: {
    github: "https://github.com/yourusername/contrast-bot",
    support: "https://discord.gg/your-support-server",
  },

  // Colors
  colors: {
    primary: 0x5865f2, // Discord Blurple
    success: 0x57f287, // Green
    warning: 0xfee75c, // Yellow
    error: 0xed4245, // Red
  },

  // Emojis
  emojis: {
    success: "✅",
    error: "❌",
    warning: "⚠️",
    info: "ℹ️",
    loading: "⏳",
  },
}
