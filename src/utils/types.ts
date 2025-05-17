import type {
  SlashCommandBuilder,
  Message,
  AutocompleteInteraction,
  ChatInputCommandInteraction,
  Collection,
} from "discord.js"

export interface Command {
  // For slash commands
  data?: SlashCommandBuilder | Omit<SlashCommandBuilder, "addSubcommand" | "addSubcommandGroup">
  execute?: (interaction: ChatInputCommandInteraction) => Promise<void>
  autocomplete?: (interaction: AutocompleteInteraction) => Promise<void>

  // For prefix commands
  name?: string
  aliases?: string[]
  description?: string
  usage?: string
  category?: string
  run?: (message: Message, args: string[]) => Promise<void>
}

// This is the proper way to extend the Discord.js Client type
declare module "discord.js" {
  interface Client {
    commands: Collection<string, Command>
    prefixCommands: Collection<string, Command>
  }
}