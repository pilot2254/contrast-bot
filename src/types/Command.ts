import type { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js"
import type { ExtendedClient } from "../structures/ExtendedClient"

export interface Command {
  data: SlashCommandBuilder | Omit<SlashCommandBuilder, "addSubcommand" | "addSubcommandGroup"> | any
  category: string
  cooldown?: number
  developerOnly?: boolean
  execute: (interaction: ChatInputCommandInteraction, client: ExtendedClient) => Promise<void>
}
