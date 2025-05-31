import type {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  ContextMenuCommandBuilder,
  SlashCommandSubcommandsOnlyBuilder,
  SlashCommandOptionsOnlyBuilder,
  AutocompleteInteraction,
} from "discord.js"
import type { ExtendedClient } from "../structures/ExtendedClient"

// More flexible command data type that accepts all valid command builders
export type CommandData =
  | SlashCommandBuilder
  | SlashCommandSubcommandsOnlyBuilder
  | SlashCommandOptionsOnlyBuilder
  | ContextMenuCommandBuilder

export interface Command {
  data: CommandData
  category: string
  cooldown?: number
  developerOnly?: boolean
  execute: (
    interaction: ChatInputCommandInteraction,
    client: ExtendedClient
  ) => Promise<void>
  autocomplete?: (
    interaction: AutocompleteInteraction,
    client: ExtendedClient
  ) => Promise<void>
}
