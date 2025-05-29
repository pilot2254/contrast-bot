export const config = {
  // Bot settings
  bot: {
    name: "Contrast Bot",
    version: "2.0.0",
    description: "A feature-rich Discord bot with economy, gambling, and leveling systems",
    prefix: "?", // For developer commands only
    developers: ["171395713064894465", "806496372093616128"], // Add your Discord IDs here
    supportServer: "https://discord.gg/your-server",
    website: "https://your-website.com",
    inviteUrl:
      "https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=8&scope=bot%20applications.commands",
  },

  // Database configuration
  database: {
    path: "./data/bot.db",
    backupInterval: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
    maxBackups: 7, // Keep 7 backup files
    enableWAL: true, // Write-Ahead Logging for better performance
    enableForeignKeys: true,
    pragmaSettings: {
      synchronous: "NORMAL", // FULL, NORMAL, OFF
      journalMode: "WAL", // DELETE, TRUNCATE, PERSIST, MEMORY, WAL, OFF
      cacheSize: -64000, // 64MB cache (negative = KB)
      tempStore: "MEMORY", // DEFAULT, FILE, MEMORY
    },
  },

  // Economy settings
  economy: {
    currency: {
      name: "coins",
      symbol: "🪙",
      startingBalance: 1000,
      maxWalletAmount: Number.POSITIVE_INFINITY, // Set to finite number to limit
      maxTransactionAmount: Number.POSITIVE_INFINITY, // Set to finite number to limit
      minTransactionAmount: 1,
    },
    safe: {
      baseCost: 5000,
      baseCapacity: 10000,
      upgradeMultiplier: 1.5,
      capacityIncreasePerTier: 10000,
      maxTier: 50, // Maximum safe tier
    },
    work: {
      cooldown: 10 * 1000, // 10 seconds
      baseReward: 100,
      maxReward: 100000,
      xpReward: 10,
      levelMultiplier: 1.2, // Reward increases with level
      randomnessRange: 0.2, // ±20% randomness
    },
    daily: {
      amount: 1000,
      cooldown: 24 * 60 * 60 * 1000, // 24 hours
      streak: {
        enabled: true,
        multiplier: 0.1, // 10% per streak day
        maxMultiplier: 2.0, // Maximum 200% bonus
        resetAfterHours: 48, // Reset streak if not claimed within 48 hours
      },
      xpReward: 25,
    },
    weekly: {
      amount: 10000,
      cooldown: 7 * 24 * 60 * 60 * 1000, // 7 days
      xpReward: 100,
    },
    monthly: {
      amount: 50000,
      cooldown: 30 * 24 * 60 * 60 * 1000, // 30 days
      xpReward: 500,
    },
    yearly: {
      amount: 1000000,
      cooldown: 365 * 24 * 60 * 60 * 1000, // 365 days
      xpReward: 10000,
    },
  },

  // Gambling settings
  gambling: {
    enabled: true, // Can disable gambling entirely
    maxBet: Number.POSITIVE_INFINITY, // Set to finite number to limit
    minBet: 100,
    maxRepeats: 10, // Maximum repeats per command
    houseEdge: 0.02, // 2% house edge for balancing
    games: {
      slots: {
        enabled: true,
        symbols: ["🍒", "🍋", "🍊", "🍇", "💎", "7️⃣"],
        payouts: {
          three_sevens: 10,
          three_diamonds: 5,
          three_fruits: 3,
          two_matching: 1.5,
        },
        jackpotChance: 0.001, // 0.1% chance for jackpot
        jackpotMultiplier: 100,
      },
      coinflip: {
        enabled: true,
        winMultiplier: 1.95, // Slightly less than 2x for house edge
      },
      numberGuess: {
        enabled: true,
        baseMultiplier: 2,
        difficultyBonus: 0.5,
        maxRange: 100,
      },
      diceRoll: {
        enabled: true,
        exactMatchMultiplier: 5.5, // Slightly less than 6x for house edge
        maxDice: 5,
      },
      russianRoulette: {
        enabled: true,
        chambers: 6,
        winMultiplier: 5.5, // Slightly less than 6x for house edge
        cooldown: 60 * 1000, // 1 minute cooldown
      },
    },
  },

  // Leveling system
  leveling: {
    enabled: true,
    baseXP: 100,
    xpMultiplier: 1.5,
    levelUpBonus: 500,
    maxLevel: Number.POSITIVE_INFINITY,
    xpSources: {
      message: 5,
      command: 10,
      gambling: 15,
      transfer: 20,
      work: 10,
      daily: 25,
      weekly: 100,
      monthly: 500,
      yearly: 10000,
    },
    levelUpNotifications: true,
    progressBarLength: 10,
  },

  // Shop configuration
  shop: {
    enabled: true,
    categories: ["upgrades", "items", "boosts"],
    maxItemsPerPage: 5,
    items: {
      trophy: {
        id: "trophy",
        name: "Trophy",
        description: "A prestigious trophy to show off your wealth",
        price: 1000000,
        category: "items",
        stackable: true,
        maxQuantity: 10,
        emoji: "🏆",
      },
      xp_boost: {
        id: "xp_boost",
        name: "XP Boost",
        description: "Instantly gain 1000 XP",
        price: 50000,
        category: "boosts",
        xpAmount: 1000,
        emoji: "⚡",
      },
      safe_upgrade: {
        id: "safe_upgrade",
        name: "Safe Upgrade",
        description: "Upgrade your safe capacity",
        price: 0, // Dynamic pricing
        category: "upgrades",
        emoji: "🔒",
      },
      lottery_ticket: {
        id: "lottery_ticket",
        name: "Lottery Ticket",
        description: "A chance to win big! Draw happens daily",
        price: 10000,
        category: "items",
        stackable: true,
        maxQuantity: 100,
        emoji: "🎫",
      },
    },
  },

  // Rate limiting
  rateLimit: {
    enabled: true,
    commands: {
      window: 60 * 1000, // 1 minute
      max: 30, // 30 commands per minute
      skipDevelopers: true,
    },
    transactions: {
      window: 5 * 60 * 1000, // 5 minutes
      max: 10, // 10 transactions per 5 minutes
      skipDevelopers: true,
    },
    gambling: {
      window: 60 * 1000, // 1 minute
      max: 50, // 50 gambling commands per minute
      skipDevelopers: true,
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
      shop: 0x9b59b6,
      reputation: 0xe67e22,
    },
    footer: {
      text: "Contrast Bot v2.0",
      iconURL: null, // Set to URL for custom footer icon
    },
    thumbnail: {
      enabled: true,
      defaultURL: null, // Set to URL for default thumbnail
    },
    author: {
      enabled: true,
      showUserAvatar: true,
    },
    timestamp: true,
  },

  // Rich presence
  presence: {
    enabled: true,
    activities: [
      {
        name: "your economy",
        type: "Watching", // Playing, Streaming, Listening, Watching, Competing
        url: null, // Only for Streaming type
      },
      {
        name: "with coins",
        type: "Playing",
        url: null,
      },
      {
        name: "the casino",
        type: "Watching",
        url: null,
      },
    ],
    status: "online", // online, idle, dnd, invisible
    rotationInterval: 30 * 1000, // 30 seconds between activity changes
  },

  // Logging configuration
  logging: {
    level: "info", // debug, info, warn, error
    enableFileLogging: true,
    logDirectory: "./logs",
    maxLogFiles: 30, // Keep 30 days of logs
    logCommands: true,
    logTransactions: true,
    logErrors: true,
    logDatabase: false, // Set to true for database query logging
  },

  // Security settings
  security: {
    enableBlacklist: true,
    enableRateLimit: true,
    maxCommandLength: 2000,
    enableInputSanitization: true,
    trustedUsers: [], // Users who bypass some restrictions
  },

  // Feature toggles
  features: {
    economy: true,
    gambling: true,
    leveling: true,
    shop: true,
    reputation: true,
    blacklist: true,
    statistics: true,
    backups: true,
  },

  // Donation links
  donations: {
    enabled: true,
    kofi: "https://ko-fi.com/yourname",
    paypal: "https://paypal.me/yourname",
    patreon: "https://patreon.com/yourname",
    github: "https://github.com/yourusername",
    bitcoin: null, // Bitcoin address
    ethereum: null, // Ethereum address
  },

  // Backup settings
  backup: {
    enabled: true,
    interval: 24 * 60 * 60 * 1000, // 24 hours
    maxBackups: 7,
    compression: true,
    location: "./backups",
  },

  // Performance settings
  performance: {
    cacheSize: 1000, // Number of items to cache
    cacheTTL: 5 * 60 * 1000, // 5 minutes cache TTL
    enableQueryOptimization: true,
    batchSize: 100, // For bulk operations
  },

  // Maintenance settings
  maintenance: {
    enabled: false,
    message: "The bot is currently under maintenance. Please try again later.",
    allowedUsers: [], // Users who can use bot during maintenance
    estimatedDuration: "30 minutes",
  },
}
