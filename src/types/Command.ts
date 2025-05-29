import type {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  ContextMenuCommandBuilder,
  SlashCommandSubcommandsOnlyBuilder,
  AutocompleteInteraction,
} from "discord.js"
import type { ExtendedClient } from "../structures/ExtendedClient"

// Define a more specific type for command data
export type CommandData =
  | SlashCommandBuilder
  | Omit<SlashCommandBuilder, "addSubcommand" | "addSubcommandGroup">
  | SlashCommandSubcommandsOnlyBuilder
  | ContextMenuCommandBuilder

export interface Command {
  data: CommandData
  category: string
  cooldown?: number
  developerOnly?: boolean
  execute: (
    interaction: ChatInputCommandInteraction, // Or a union type if you have context menu commands, etc.
    client: ExtendedClient,
  ) => Promise<void>
  autocomplete?: (interaction: AutocompleteInteraction, client: ExtendedClient) => Promise<void>
}
