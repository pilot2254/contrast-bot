// Re-export all types for easier imports
export * from "./Command"

// Define additional types

export interface UserProfile {
  userId: string
  balance: number
  safeBalance: number
  safeCapacity: number
  safeTier: number
  level: number
  xp: number
  totalCommands: number
  createdAt: Date
  updatedAt: Date
}

export interface ClaimStatus {
  claimed: boolean
  timeLeft: number
  streak: number
}

export interface WorkResult {
  reward: number
  message: string
  xpGained: number
  leveledUp: boolean
  newLevel?: number
}

export interface GamblingResult {
  isWin: boolean
  winnings: number
}

export interface SlotsResult extends GamblingResult {
  result: string[]
  multiplier: number
}

export interface CoinflipResult extends GamblingResult {
  result: string
}

export interface NumberGuessResult extends GamblingResult {
  result: number
}

export interface DiceRollResult extends GamblingResult {
  results: number[]
  total: number
}

export interface RussianRouletteResult {
  survived: boolean
  winnings: number
}

export interface ShopItem {
  id: string
  name: string
  description: string
  price: number
  category: string
  stackable?: boolean
  xpAmount?: number
}

export interface InventoryItem extends ShopItem {
  quantity: number
  purchasedAt: Date
}

export interface UserUpgrades {
  safe: {
    tier: number
    capacity: number
    nextUpgradeCost: number
  }
}

export interface ReputationProfile {
  given: number
  received: number
}

export interface BlacklistEntry {
  userId: string
  reason: string
  blacklistedBy: string
  blacklistedAt: Date
}

export interface CommandStats {
  commandName: string
  usageCount: number
  lastUsed: Date
}

export interface EconomyStats {
  totalCoins: number
  richestUser: { userId: string; balance: number }
  averageBalance: number
}
