export const databaseConfig = {
  path: "./data/bot.db",
  backupInterval: 24 * 60 * 60 * 1000,
  maxBackups: 7,
  enableWAL: true,
  enableForeignKeys: true,
  pragmaSettings: {
    synchronous: "NORMAL",
    journalMode: "WAL",
    cacheSize: -64000,
    tempStore: "MEMORY",
  },
}
