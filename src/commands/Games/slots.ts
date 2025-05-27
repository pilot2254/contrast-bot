import { SlashCommandBuilder } from "discord.js"

const SLOT_SYMBOLS = {
  "🍒": { name: "Cherry", weight: 30, value: 2 },
  "🍋": { name: "Lemon", weight: 25, value: 3 },
  "🍊": { name: "Orange", weight: 20, value: 4 },
  "🍇": { name: "Grape", weight: 15, value: 5 },
  "🔔": { name: "Bell", weight: 8, value: 10 },
  "💎": { name: "Diamond", weight: 2, value: 50 },
}

const JACKPOT_SYMBOL = "💰"
const JACKPOT_MULTIPLIER = 100

export const data = new SlashCommandBuilder()
  .setName("slots")
  .setDescription("Spin the slot machine and win big!")
  .addIntegerOption((option) => option.setName("bet").setDescription("Amount to bet").setRequired(true).setMinValue(1))
