import { Events } from "discord.js";
import type { ExtendedClient } from "../structures/ExtendedClient";

export default {
  name: Events.ClientReady,
  once: true,
  execute(client: ExtendedClient) {
    if (!client.user) return;
  },
};
