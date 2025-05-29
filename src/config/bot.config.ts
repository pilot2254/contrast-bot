export const config = {
  // Bot settings
  bot: {
    name: "Contrast Bot",
    version: "2.0.0",
    prefix: "?", // For developer commands only
    developers: ["171395713064894465", "806496372093616128"],
    supportServer: "https://discord.gg/your-server",
    website: "https://your-website.com",
  },

  // Database configuration
  database: {
    path: "./data/bot.db",
  },

  // Economy settings
  economy: {
    currency: {
      name: "coins",
      symbol: "🪙",
      startingBalance: 1000,
      maxWalletAmount: Number.POSITIVE_INFINITY,
      maxTransactionAmount: Number.POSITIVE_INFINITY,
    },
    safe: {
      baseCost: 5000,
      baseCapacity: 10000,
      upgradeMultiplier: 1.5,
      capacityIncreasePerTier: 10000,
    },
    work: {
      cooldown: 10000, // 10 seconds
      baseReward: 100,
      maxReward: 100000,
      xpReward: 10,
    },
    daily: {
      amount: 1000,
      streak: {
        enabled: true,
        multiplier: 0.1,
        maxMultiplier: 2.0,
      },
      xpReward: 25,
    },
    weekly: {
      amount: 10000,
      xpReward: 100,
    },
    monthly: {
      amount: 50000,
      xpReward: 500,
    },
    yearly: {
      amount: 1000000,
      xpReward: 10000,
    },
  },

  // Gambling settings
  gambling: {
    maxBet: Number.POSITIVE_INFINITY,
    minBet: 100,
    games: {
      slots: {
        symbols: ["🍒", "🍋", "🍊", "🍇", "💎", "7️⃣"],
        payouts: {
          three_sevens: 10,
          three_diamonds: 5,
          three_fruits: 3,
          two_matching: 1.5,
        },
      },
      coinflip: {
        winMultiplier: 2,
      },
      numberGuess: {
        baseMultiplier: 2,
        difficultyBonus: 0.5,
      },
      diceRoll: {
        exactMatchMultiplier: 6,
      },
      russianRoulette: {
        chambers: 6,
        winMultiplier: 6,
      },
    },
  },

  // Leveling system
  leveling: {
    baseXP: 100,
    xpMultiplier: 1.5,
    levelUpBonus: 500,
    maxLevel: Number.POSITIVE_INFINITY,
    xpSources: {
      message: 5,
      command: 10,
      gambling: 15,
      transfer: 20,
    },
  },

  // Shop configuration
  shop: {
    categories: ["upgrades", "items", "boosts"],
    items: {
      trophy: {
        id: "trophy",
        name: "Trophy",
        description: "A prestigious trophy to show off your wealth",
        price: 1000000,
        category: "items",
        stackable: true,
      },
      xpBoost: {
        id: "xp_boost",
        name: "XP Boost",
        description: "Instantly gain 1000 XP",
        price: 50000,
        category: "boosts",
        xpAmount: 1000,
      },
      safe_upgrade: {
        id: "safe_upgrade",
        name: "Safe Upgrade",
        description: "Upgrade your safe capacity",
        price: 0, // Dynamic price based on tier
        category: "upgrades",
      },
    },
  },

  // Rate limiting
  rateLimit: {
    commands: {
      window: 60000, // 1 minute
      max: 30,
    },
    transactions: {
      window: 300000, // 5 minutes
      max: 10,
    },
  },

  // Embed styling
  embeds: {
    colors: {
      primary: 0x5865f2,
      success: 0x57f287,
      warning: 0xfee75c,
      error: 0xed4245,
      info: 0x5865f2,
      economy: 0xf1c40f,
      gambling: 0xe91e63,
      level: 0x3498db,
    },
    footer: {
      text: "Contrast Bot v2.0",
      iconURL: null,
    },
  },

  // Rich presence
  presence: {
    name: "your economy",
    type: "Watching", // Playing, Streaming, Listening, Watching, Competing
    status: "online", // online, idle, dnd, invisible
  },

  // Donation links
  donations: {
    kofi: "https://ko-fi.com/yourname",
    paypal: "https://paypal.me/yourname",
    patreon: "https://patreon.com/yourname",
  },
}
