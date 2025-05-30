import { config } from "../config/bot.config"
import { Logger } from "./Logger"

export class ConfigValidator {
  private logger = new Logger()

  /**
   * Validate the entire configuration
   */
  validateConfig(): boolean {
    try {
      this.validateBotConfig()
      this.validateEconomyConfig()
      this.validateGamblingConfig()
      this.validateLevelingConfig()
      this.validateEmbedConfig()
      this.validateRateLimitConfig()

      this.logger.success("Configuration validation passed")
      return true
    } catch (error) {
      this.logger.error("Configuration validation failed:", error)
      return false
    }
  }

  private validateBotConfig(): void {
    const { bot } = config

    if (!bot.name || typeof bot.name !== "string") {
      throw new Error("Bot name must be a non-empty string")
    }

    if (!bot.version || typeof bot.version !== "string") {
      throw new Error("Bot version must be a non-empty string")
    }

    if (!Array.isArray(bot.developers) || bot.developers.length === 0) {
      throw new Error("At least one developer ID must be specified")
    }

    bot.developers.forEach((id, index) => {
      if (typeof id !== "string" || !/^\d{17,19}$/.test(id)) {
        throw new Error(`Invalid developer ID at index ${index}: ${id}`)
      }
    })
  }

  private validateEconomyConfig(): void {
    const { economy } = config

    if (economy.currency.startingBalance < 0) {
      throw new Error("Starting balance cannot be negative")
    }

    if (economy.currency.minTransactionAmount < 1) {
      throw new Error("Minimum transaction amount must be at least 1")
    }

    if (economy.safe.baseCost < 1) {
      throw new Error("Safe base cost must be at least 1")
    }

    if (economy.safe.upgradeMultiplier <= 1) {
      throw new Error("Safe upgrade multiplier must be greater than 1")
    }

    if (economy.work.cooldown < 1000) {
      throw new Error("Work cooldown must be at least 1 second")
    }
  }

  private validateGamblingConfig(): void {
    const { gambling } = config

    if (gambling.minBet < 1) {
      throw new Error("Minimum bet must be at least 1")
    }

    if (gambling.maxBet < gambling.minBet) {
      throw new Error(
        "Maximum bet must be greater than or equal to minimum bet"
      )
    }

    if (gambling.houseEdge < 0 || gambling.houseEdge > 1) {
      throw new Error("House edge must be between 0 and 1")
    }

    // Validate individual games
    Object.entries(gambling.games).forEach(([gameName, gameConfig]) => {
      if (typeof gameConfig.enabled !== "boolean") {
        throw new Error(`Game ${gameName} must have enabled property`)
      }
    })
  }

  private validateLevelingConfig(): void {
    const { leveling } = config

    if (leveling.baseXP < 1) {
      throw new Error("Base XP must be at least 1")
    }

    if (leveling.xpMultiplier <= 1) {
      throw new Error("XP multiplier must be greater than 1")
    }

    if (leveling.levelUpBonus < 0) {
      throw new Error("Level up bonus cannot be negative")
    }
  }

  private validateEmbedConfig(): void {
    const { embeds } = config

    Object.entries(embeds.colors).forEach(([colorName, colorValue]) => {
      if (
        typeof colorValue !== "number" ||
        colorValue < 0 ||
        colorValue > 0xffffff
      ) {
        throw new Error(`Invalid color value for ${colorName}: ${colorValue}`)
      }
    })
  }

  private validateRateLimitConfig(): void {
    const { rateLimit } = config

    Object.entries(rateLimit).forEach(([limitName, limitConfig]) => {
      if (limitName === "enabled") return

      if (typeof limitConfig === "object" && limitConfig !== null) {
        if (limitConfig.window < 1000) {
          throw new Error(
            `Rate limit window for ${limitName} must be at least 1 second`
          )
        }

        if (limitConfig.max < 1) {
          throw new Error(`Rate limit max for ${limitName} must be at least 1`)
        }
      }
    })
  }
}
