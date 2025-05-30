import {
  REST,
  Routes,
  type RESTPostAPIChatInputApplicationCommandsJSONBody,
} from "discord.js"
import { readdirSync } from "fs"
import { join } from "path"
import type { ExtendedClient } from "../structures/ExtendedClient"
import type { Command } from "../types/Command"

export class CommandHandler {
  private rest: REST

  constructor(private client: ExtendedClient) {
    if (!process.env.DISCORD_TOKEN) {
      this.client.logger.error("DISCORD_TOKEN environment variable is not set.")
      throw new Error("DISCORD_TOKEN is not set.")
    }
    this.rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN)
  }

  async loadCommands(): Promise<void> {
    const commandsToRegister: RESTPostAPIChatInputApplicationCommandsJSONBody[] =
      []
    const commandsPath = join(__dirname, "..", "commands")
    const commandFolders = readdirSync(commandsPath)

    for (const folder of commandFolders) {
      const folderPath = join(commandsPath, folder)
      const commandFiles = readdirSync(folderPath).filter((file) =>
        process.env.NODE_ENV === "production"
          ? file.endsWith(".js")
          : file.endsWith(".ts") || file.endsWith(".js")
      )

      for (const file of commandFiles) {
        const filePath = join(folderPath, file)

        try {
          const { default: command } = (await import(filePath)) as {
            default: Command
          }

          if (command && "data" in command && "execute" in command) {
            this.client.commands.set(command.data.name, command)

            // Convert command data to JSON safely
            let commandJson: RESTPostAPIChatInputApplicationCommandsJSONBody
            try {
              commandJson =
                command.data.toJSON() as RESTPostAPIChatInputApplicationCommandsJSONBody
              commandsToRegister.push(commandJson)
            } catch (error) {
              this.client.logger.warn(
                `Failed to convert command ${command.data.name} to JSON:`,
                error
              )
            }
          } else {
            this.client.logger.warn(
              `Command at ${filePath} is missing required 'data' or 'execute' properties`
            )
          }
        } catch (error: unknown) {
          let errorMessage = `Error loading command at ${filePath}: `
          if (error instanceof Error) {
            errorMessage += error.message
          } else if (typeof error === "string") {
            errorMessage += error
          } else {
            errorMessage += "An unknown error occurred."
          }
          this.client.logger.error(errorMessage, error)
        }
      }
    }

    // Register slash commands
    try {
      if (!process.env.CLIENT_ID) {
        this.client.logger.error(
          "CLIENT_ID environment variable is not set. Cannot register commands."
        )
        return
      }
      this.client.logger.info(
        `Registering ${commandsToRegister.length} slash commands...`
      )

      if (process.env.GUILD_ID) {
        // Guild commands (instant update, for development)
        await this.rest.put(
          Routes.applicationGuildCommands(
            process.env.CLIENT_ID,
            process.env.GUILD_ID
          ),
          {
            body: commandsToRegister,
          }
        )
      } else {
        // Global commands (takes up to 1 hour to update)
        await this.rest.put(Routes.applicationCommands(process.env.CLIENT_ID), {
          body: commandsToRegister,
        })
      }

      this.client.logger.success("Successfully registered slash commands")
    } catch (error: unknown) {
      this.client.logger.error("Failed to register slash commands:", error)
      // Optionally rethrow or handle more gracefully depending on desired startup behavior
      // throw error;
    }
  }
}
