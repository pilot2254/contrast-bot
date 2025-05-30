import type { ExtendedClient } from "../structures/ExtendedClient"
import { config } from "../config/bot.config"

export class GamblingService {
  constructor(private client: ExtendedClient) {}

  // Validate bet amount
  private async validateBet(userId: string, amount: number): Promise<void> {
    if (amount < config.gambling.minBet) {
      throw new Error(
        `Minimum bet is ${config.gambling.minBet} ${config.economy.currency.name}`
      )
    }

    if (amount > config.gambling.maxBet) {
      throw new Error(
        `Maximum bet is ${config.gambling.maxBet} ${config.economy.currency.name}`
      )
    }

    const user = await this.client.database.getUser(userId)
    if (user.balance < amount) {
      throw new Error(
        `You don't have enough ${config.economy.currency.name} to place this bet`
      )
    }
  }

  // Slots game
  async playSlots(
    userId: string,
    bet: number
  ): Promise<{
    result: string[]
    winnings: number
    multiplier: number
    isWin: boolean
  }> {
    await this.validateBet(userId, bet)

    const symbols = config.gambling.games.slots.symbols
    const result = [
      symbols[Math.floor(Math.random() * symbols.length)],
      symbols[Math.floor(Math.random() * symbols.length)],
      symbols[Math.floor(Math.random() * symbols.length)],
    ]

    // Determine win
    let multiplier = 0
    let isWin = false

    // Check for three of a kind
    if (result[0] === result[1] && result[1] === result[2]) {
      isWin = true

      if (result[0] === "7️⃣") {
        multiplier = config.gambling.games.slots.payouts.three_sevens
      } else if (result[0] === "💎") {
        multiplier = config.gambling.games.slots.payouts.three_diamonds
      } else {
        multiplier = config.gambling.games.slots.payouts.three_fruits
      }
    }
    // Check for two of a kind
    else if (
      result[0] === result[1] ||
      result[1] === result[2] ||
      result[0] === result[2]
    ) {
      isWin = true
      multiplier = config.gambling.games.slots.payouts.two_matching
    }

    const winnings = Math.floor(bet * multiplier)

    // Update balance
    await this.client.database.transaction(async () => {
      const user = await this.client.database.getUser(userId)

      if (isWin) {
        // Add winnings (net gain, so we add winnings - bet)
        const netGain = winnings - bet
        await this.client.database.updateUser(userId, {
          balance: user.balance + netGain,
        })
        await this.client.database.logTransaction(
          userId,
          "add",
          netGain,
          "Slots win"
        )
      } else {
        // Remove bet
        await this.client.database.updateUser(userId, {
          balance: user.balance - bet,
        })
        await this.client.database.logTransaction(
          userId,
          "remove",
          bet,
          "Slots loss"
        )
      }

      // Add XP
      await this.client.database.run(
        "UPDATE users SET xp = xp + ? WHERE user_id = ?",
        [config.leveling.xpSources.gambling, userId]
      )
    })

    return { result, winnings, multiplier, isWin }
  }

  // Coinflip game
  async playCoinflip(
    userId: string,
    bet: number,
    choice: "heads" | "tails"
  ): Promise<{ result: string; winnings: number; isWin: boolean }> {
    await this.validateBet(userId, bet)

    const result = Math.random() < 0.5 ? "heads" : "tails"
    const isWin = result === choice

    const winnings = isWin
      ? Math.floor(bet * config.gambling.games.coinflip.winMultiplier)
      : 0

    // Update balance
    await this.client.database.transaction(async () => {
      const user = await this.client.database.getUser(userId)

      if (isWin) {
        // Add winnings (net gain)
        const netGain = winnings - bet
        await this.client.database.updateUser(userId, {
          balance: user.balance + netGain,
        })
        await this.client.database.logTransaction(
          userId,
          "add",
          netGain,
          "Coinflip win"
        )
      } else {
        // Remove bet
        await this.client.database.updateUser(userId, {
          balance: user.balance - bet,
        })
        await this.client.database.logTransaction(
          userId,
          "remove",
          bet,
          "Coinflip loss"
        )
      }

      // Add XP
      await this.client.database.run(
        "UPDATE users SET xp = xp + ? WHERE user_id = ?",
        [config.leveling.xpSources.gambling, userId]
      )
    })

    return { result, winnings, isWin }
  }

  // Number guess game
  async playNumberGuess(
    userId: string,
    bet: number,
    guess: number,
    range: number
  ): Promise<{ result: number; winnings: number; isWin: boolean }> {
    await this.validateBet(userId, bet)

    if (guess < 1 || guess > range) {
      throw new Error(`Your guess must be between 1 and ${range}`)
    }

    const result = Math.floor(Math.random() * range) + 1
    const isWin = result === guess

    // Calculate multiplier based on difficulty (range)
    const multiplier =
      config.gambling.games.numberGuess.baseMultiplier +
      (range - 2) * config.gambling.games.numberGuess.difficultyBonus

    const winnings = isWin ? Math.floor(bet * multiplier) : 0

    // Update balance
    await this.client.database.transaction(async () => {
      const user = await this.client.database.getUser(userId)

      if (isWin) {
        // Add winnings (net gain)
        const netGain = winnings - bet
        await this.client.database.updateUser(userId, {
          balance: user.balance + netGain,
        })
        await this.client.database.logTransaction(
          userId,
          "add",
          netGain,
          "Number guess win"
        )
      } else {
        // Remove bet
        await this.client.database.updateUser(userId, {
          balance: user.balance - bet,
        })
        await this.client.database.logTransaction(
          userId,
          "remove",
          bet,
          "Number guess loss"
        )
      }

      // Add XP
      await this.client.database.run(
        "UPDATE users SET xp = xp + ? WHERE user_id = ?",
        [config.leveling.xpSources.gambling, userId]
      )
    })

    return { result, winnings, isWin }
  }

  // Dice roll game
  async playDiceRoll(
    userId: string,
    bet: number,
    guess: number,
    diceCount = 1
  ): Promise<{
    results: number[]
    total: number
    winnings: number
    isWin: boolean
  }> {
    await this.validateBet(userId, bet)

    if (guess < diceCount || guess > diceCount * 6) {
      throw new Error(
        `Your guess must be between ${diceCount} and ${diceCount * 6}`
      )
    }

    // Roll dice
    const results: number[] = []
    for (let i = 0; i < diceCount; i++) {
      results.push(Math.floor(Math.random() * 6) + 1)
    }

    const total = results.reduce((sum, val) => sum + val, 0)
    const isWin = total === guess

    // Calculate winnings
    const multiplier = config.gambling.games.diceRoll.exactMatchMultiplier
    const winnings = isWin ? Math.floor(bet * multiplier) : 0

    // Update balance
    await this.client.database.transaction(async () => {
      const user = await this.client.database.getUser(userId)

      if (isWin) {
        // Add winnings (net gain)
        const netGain = winnings - bet
        await this.client.database.updateUser(userId, {
          balance: user.balance + netGain,
        })
        await this.client.database.logTransaction(
          userId,
          "add",
          netGain,
          "Dice roll win"
        )
      } else {
        // Remove bet
        await this.client.database.updateUser(userId, {
          balance: user.balance - bet,
        })
        await this.client.database.logTransaction(
          userId,
          "remove",
          bet,
          "Dice roll loss"
        )
      }

      // Add XP
      await this.client.database.run(
        "UPDATE users SET xp = xp + ? WHERE user_id = ?",
        [config.leveling.xpSources.gambling, userId]
      )
    })

    return { results, total, winnings, isWin }
  }

  // Russian roulette (all-in)
  async playRussianRoulette(
    userId: string
  ): Promise<{ survived: boolean; winnings: number }> {
    // Get user's balance
    const user = await this.client.database.getUser(userId)
    const wallet = user.balance

    if (wallet <= 0) {
      throw new Error("You don't have any coins to bet")
    }

    // All-in bet
    const bet = wallet

    // Determine outcome (1/6 chance of losing)
    const chambers = config.gambling.games.russianRoulette.chambers
    const bulletPosition = Math.floor(Math.random() * chambers)
    const playerPosition = Math.floor(Math.random() * chambers)

    const survived = bulletPosition !== playerPosition

    // Calculate winnings
    const multiplier = config.gambling.games.russianRoulette.winMultiplier
    const winnings = survived ? Math.floor(bet * multiplier) : 0

    // Update balance
    await this.client.database.transaction(async () => {
      if (survived) {
        // Add winnings (net gain)
        const netGain = winnings - bet
        await this.client.database.updateUser(userId, {
          balance: user.balance + netGain,
        })
        await this.client.database.logTransaction(
          userId,
          "add",
          netGain,
          "Russian roulette win"
        )
      } else {
        // Remove all balance
        await this.client.database.updateUser(userId, { balance: 0 })
        await this.client.database.logTransaction(
          userId,
          "remove",
          bet,
          "Russian roulette loss"
        )
      }

      // Add XP
      await this.client.database.run(
        "UPDATE users SET xp = xp + ? WHERE user_id = ?",
        [config.leveling.xpSources.gambling, userId]
      )
    })

    return { survived, winnings }
  }
}
