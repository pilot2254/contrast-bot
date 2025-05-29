import { readdirSync } from "fs";
import { join } from "path";
import type { ExtendedClient } from "../structures/ExtendedClient";

export class EventHandler {
  constructor(private client: ExtendedClient) {}

  async loadEvents(): Promise<void> {
    const eventsPath = join(__dirname, "..", "events");
    const eventFiles = readdirSync(eventsPath).filter(
      (file) => file.endsWith(".ts") || file.endsWith(".js"),
    );

    for (const file of eventFiles) {
      const filePath = join(eventsPath, file);

      try {
        // Use require for CommonJS
        const event = require(filePath).default;

        if (event.once) {
          this.client.once(event.name, (...args) => event.execute(...args));
        } else {
          this.client.on(event.name, (...args) => event.execute(...args));
        }

        this.client.logger.debug(`Loaded event: ${event.name}`);
      } catch (error) {
        this.client.logger.error(`Error loading event at ${filePath}:`, error);
      }
    }
  }
}
