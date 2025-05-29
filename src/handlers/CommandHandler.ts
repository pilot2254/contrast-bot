import { REST, Routes } from "discord.js"
import { readdirSync } from "fs"
import { join } from "path"
import type { ExtendedClient } from "../structures/ExtendedClient"
import type { Command } from "../types/Command"

export class CommandHandler {
  private rest: REST

  constructor(private client: ExtendedClient) {
    this.rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN!)
  }

  async loadCommands(): Promise<void> {
    const commands: any[] = []
    const commandsPath = join(__dirname, "..", "commands")
    const commandFolders = readdirSync(commandsPath)

    for (const folder of commandFolders) {
      const folderPath = join(commandsPath, folder)
      const commandFiles = readdirSync(folderPath).filter((file) => file.endsWith(".ts") || file.endsWith(".js"))

      for (const file of commandFiles) {
        const filePath = join(folderPath, file)

        try {
          // Use require for CommonJS
          const command: Command = require(filePath).default

          if (command && "data" in command && "execute" in command) {
            this.client.commands.set(command.data.name, command)
            commands.push(command.data.toJSON())
          } else {
            this.client.logger.warn(`Command at ${filePath} is missing required properties`)
          }
        } catch (error) {
          this.client.logger.error(`Error loading command at ${filePath}:`, error)
        }
      }
    }

    // Register slash commands
    try {
      this.client.logger.info(`Registering ${commands.length} slash commands...`)

      if (process.env.GUILD_ID) {
        // Guild commands (instant update, for development)
        await this.rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID!, process.env.GUILD_ID), {
          body: commands,
        })
      } else {
        // Global commands (takes up to 1 hour to update)
        await this.rest.put(Routes.applicationCommands(process.env.CLIENT_ID!), { body: commands })
      }

      this.client.logger.success("Successfully registered slash commands")
    } catch (error) {
      this.client.logger.error("Failed to register slash commands:", error)
      throw error
    }
  }
}
