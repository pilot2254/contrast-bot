export const economyConfig = {
  currency: {
    name: "coins",
    symbol: "🪙",
    startingBalance: 1000,
    maxWalletAmount: Number.POSITIVE_INFINITY,
    maxTransactionAmount: Number.POSITIVE_INFINITY,
    minTransactionAmount: 1,
  },
  safe: {
    baseCost: 5000,
    baseCapacity: 10000,
    upgradeMultiplier: 1.5,
    capacityIncreasePerTier: 10000,
    maxTier: 50,
  },
  work: {
    cooldown: 10 * 1000,
    baseReward: 100,
    maxReward: 100000,
    xpReward: 10,
    levelMultiplier: 1.2,
    randomnessRange: 0.2,
  },
  daily: {
    amount: 1000,
    cooldown: 24 * 60 * 60 * 1000,
    streak: {
      enabled: true,
      multiplier: 0.1,
      maxMultiplier: 2.0,
      resetAfterHours: 48,
    },
    xpReward: 25,
  },
  weekly: {
    amount: 10000,
    cooldown: 7 * 24 * 60 * 60 * 1000,
    xpReward: 100,
  },
  monthly: {
    amount: 50000,
    cooldown: 30 * 24 * 60 * 60 * 1000,
    xpReward: 500,
  },
  yearly: {
    amount: 1000000,
    cooldown: 365 * 24 * 60 * 60 * 1000,
    xpReward: 10000,
  },
}
