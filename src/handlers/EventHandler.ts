import { readdirSync } from "fs"
import { join } from "path"
import type { ExtendedClient } from "../structures/ExtendedClient"
import type { ClientEvents } from "discord.js"

// Define a basic structure for an event module
interface EventModule<K extends keyof ClientEvents = keyof ClientEvents> {
  name: K
  once?: boolean
  execute: (...args: ClientEvents[K]) => void | Promise<void>
}

export class EventHandler {
  constructor(private client: ExtendedClient) {}

  async loadEvents(): Promise<void> {
    const eventsPath = join(__dirname, "..", "events")
    const eventFiles = readdirSync(eventsPath).filter((file) => file.endsWith(".ts") || file.endsWith(".js"))

    for (const file of eventFiles) {
      const filePath = join(eventsPath, file)

      try {
        const { default: event } = (await import(filePath)) as { default: EventModule }

        if (event.once) {
          this.client.once(event.name, (...args) => event.execute(...args))
        } else {
          this.client.on(event.name, (...args) => event.execute(...args))
        }

        this.client.logger.debug(`Loaded event: ${event.name}`)
      } catch (error: unknown) {
        let errorMessage = `Error loading event at ${filePath}: `
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
}
