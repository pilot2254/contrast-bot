export const featureConfig = {
  economy: true,
  gambling: true,
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
  shop: true,
  reputation: true,
  blacklist: true,
  statistics: true,
  backups: true,

  presence: {
    enabled: true,
    activities: [
      { name: "your economy", type: "Watching", url: null },
      { name: "with coins", type: "Playing", url: null },
      { name: "the casino", type: "Watching", url: null },
    ],
    status: "online",
    rotationInterval: 30 * 1000,
  },

  logging: {
    level: "info",
    enableFileLogging: true,
    logDirectory: "./logs",
    maxLogFiles: 30,
    logCommands: true,
    logTransactions: true,
    logErrors: true,
    logDatabase: false,
  },

  rateLimit: {
    enabled: true,
    commands: {
      window: 60 * 1000,
      max: 30,
      skipDevelopers: true,
    },
    transactions: {
      window: 5 * 60 * 1000,
      max: 10,
      skipDevelopers: true,
    },
    gambling: {
      window: 60 * 1000,
      max: 50,
      skipDevelopers: true,
    },
  },

  donations: {
    enabled: true,
    kofi: "https://ko-fi.com/yourname",
    paypal: "https://paypal.me/yourname",
    patreon: "https://patreon.com/yourname",
    github: "https://github.com/yourusername",
    bitcoin: null,
    ethereum: null,
  },
}
