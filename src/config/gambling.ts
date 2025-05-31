export const gamblingConfig = {
  enabled: true,
  maxBet: Number.POSITIVE_INFINITY,
  minBet: 100,
  maxRepeats: 10,
  houseEdge: 0.02,
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
    },
    coinflip: {
      enabled: true,
      winMultiplier: 1.95,
    },
    numberGuess: {
      enabled: true,
      baseMultiplier: 2,
      difficultyBonus: 0.5,
      maxRange: 100,
    },
    diceRoll: {
      enabled: true,
      exactMatchMultiplier: 5.5,
      maxDice: 5,
    },
    russianRoulette: {
      enabled: true,
      chambers: 6,
      winMultiplier: 5.5,
      cooldown: 60 * 1000,
    },
  },
}
