import type { ExtendedClient } from "../structures/ExtendedClient";
import { config } from "../config/bot.config";

export class EconomyService {
  constructor(private client: ExtendedClient) {}

  // User balance methods
  async getBalance(
    userId: string,
  ): Promise<{ wallet: number; safe: number; safeCapacity: number }> {
    const user = await this.client.database.getUser(userId);
    return {
      wallet: user.balance,
      safe: user.safe_balance,
      safeCapacity: user.safe_capacity,
    };
  }

  async addBalance(
    userId: string,
    amount: number,
    reason: string,
  ): Promise<number> {
    if (amount <= 0) throw new Error("Amount must be positive");

    try {
      return await this.client.database.transaction(async () => {
        return await this._addBalanceInternal(userId, amount, reason);
      });
    } catch (error) {
      this.client.logger.error(
        `Error adding balance for user ${userId}:`,
        error,
      );
      throw error;
    }
  }

  // Internal method that doesn't start a transaction
  public async _addBalanceInternal(
    userId: string,
    amount: number,
    reason: string,
  ): Promise<number> {
    // Ensure user exists
    await this.client.database.createUser(userId);

    // Get current balance
    const user = await this.client.database.getUser(userId);

    // Check for wallet limit
    const newBalance = user.balance + amount;
    if (
      config.economy.currency.maxWalletAmount !== Number.POSITIVE_INFINITY &&
      newBalance > config.economy.currency.maxWalletAmount
    ) {
      throw new Error(
        `Wallet cannot hold more than ${config.economy.currency.maxWalletAmount.toLocaleString()} ${config.economy.currency.symbol}`,
      );
    }

    // Update balance
    await this.client.database.updateUser(userId, { balance: newBalance });

    // Log transaction
    await this.client.database.logTransaction(userId, "add", amount, reason);

    return newBalance;
  }

  async removeBalance(
    userId: string,
    amount: number,
    reason: string,
  ): Promise<number> {
    if (amount <= 0) throw new Error("Amount must be positive");

    try {
      return await this.client.database.transaction(async () => {
        return await this._removeBalanceInternal(userId, amount, reason);
      });
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("Insufficient balance")
      ) {
        throw error;
      }
      this.client.logger.error(
        `Error removing balance for user ${userId}:`,
        error,
      );
      throw error;
    }
  }

  // Internal method that doesn't start a transaction
  private async _removeBalanceInternal(
    userId: string,
    amount: number,
    reason: string,
  ): Promise<number> {
    // Ensure user exists
    await this.client.database.createUser(userId);

    // Get current balance
    const user = await this.client.database.getUser(userId);

    // Check if user has enough balance
    if (user.balance < amount) {
      throw new Error(
        `Insufficient balance. You need ${amount.toLocaleString()} ${config.economy.currency.symbol}, but you only have ${user.balance.toLocaleString()} ${config.economy.currency.symbol}`,
      );
    }

    const newBalance = user.balance - amount;

    // Update balance
    await this.client.database.updateUser(userId, { balance: newBalance });

    // Log transaction
    await this.client.database.logTransaction(userId, "remove", amount, reason);

    return newBalance;
  }

  async transferBalance(
    senderId: string,
    receiverId: string,
    amount: number,
  ): Promise<{ senderBalance: number; receiverBalance: number }> {
    if (amount <= 0) throw new Error("Amount must be positive");
    if (senderId === receiverId)
      throw new Error("You cannot transfer to yourself");

    // Check transaction limits
    if (
      config.economy.currency.maxTransactionAmount !==
        Number.POSITIVE_INFINITY &&
      amount > config.economy.currency.maxTransactionAmount
    ) {
      throw new Error(
        `Cannot transfer more than ${config.economy.currency.maxTransactionAmount.toLocaleString()} ${config.economy.currency.symbol}`,
      );
    }

    try {
      return await this.client.database.transaction(async () => {
        // Ensure both users exist
        await this.client.database.createUser(senderId);
        await this.client.database.createUser(receiverId);

        // Get sender balance
        const sender = await this.client.database.getUser(senderId);

        // Check if sender has enough balance
        if (sender.balance < amount) {
          throw new Error(
            `Insufficient balance. You need ${amount.toLocaleString()} ${config.economy.currency.symbol}, but you only have ${sender.balance.toLocaleString()} ${config.economy.currency.symbol}`,
          );
        }

        // Remove from sender
        const senderBalance = await this._removeBalanceInternal(
          senderId,
          amount,
          `Transfer to ${receiverId}`,
        );

        // Add to receiver
        const receiverBalance = await this._addBalanceInternal(
          receiverId,
          amount,
          `Transfer from ${senderId}`,
        );

        // Add XP for transfer
        await this._addXPInternal(
          senderId,
          config.leveling.xpSources.transfer,
          "Transfer",
        );

        return { senderBalance, receiverBalance };
      });
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message.includes("Insufficient balance") ||
          error.message.includes("Cannot transfer"))
      ) {
        throw error;
      }
      this.client.logger.error(
        `Error transferring balance from ${senderId} to ${receiverId}:`,
        error,
      );
      throw new Error("An error occurred while transferring funds");
    }
  }

  // Safe methods
  async depositToSafe(
    userId: string,
    amount: number,
  ): Promise<{ wallet: number; safe: number }> {
    if (amount <= 0) throw new Error("Amount must be positive");

    try {
      return await this.client.database.transaction(async () => {
        // Ensure user exists
        await this.client.database.createUser(userId);

        // Get user data
        const user = await this.client.database.getUser(userId);

        // Check if user has enough balance
        if (user.balance < amount) {
          throw new Error(
            `Insufficient balance. You need ${amount.toLocaleString()} ${config.economy.currency.symbol}, but you only have ${user.balance.toLocaleString()} ${config.economy.currency.symbol}`,
          );
        }

        // Check if safe has enough capacity
        const remainingCapacity = user.safe_capacity - user.safe_balance;
        if (amount > remainingCapacity) {
          throw new Error(
            `Your safe can only hold ${remainingCapacity.toLocaleString()} more ${config.economy.currency.symbol}`,
          );
        }

        // Update balances
        const newWalletBalance = user.balance - amount;
        const newSafeBalance = user.safe_balance + amount;

        await this.client.database.updateUser(userId, {
          balance: newWalletBalance,
          safe_balance: newSafeBalance,
        });

        // Log transaction
        await this.client.database.logTransaction(
          userId,
          "deposit",
          amount,
          "Deposit to safe",
        );

        return { wallet: newWalletBalance, safe: newSafeBalance };
      });
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message.includes("Insufficient balance") ||
          error.message.includes("Your safe can only hold"))
      ) {
        throw error;
      }
      this.client.logger.error(
        `Error depositing to safe for user ${userId}:`,
        error,
      );
      throw new Error("An error occurred while depositing to your safe");
    }
  }

  async withdrawFromSafe(
    userId: string,
    amount: number,
  ): Promise<{ wallet: number; safe: number }> {
    if (amount <= 0) throw new Error("Amount must be positive");

    try {
      return await this.client.database.transaction(async () => {
        // Ensure user exists
        await this.client.database.createUser(userId);

        // Get user data
        const user = await this.client.database.getUser(userId);

        // Check if user has enough in safe
        if (user.safe_balance < amount) {
          throw new Error(
            `Insufficient safe balance. You need ${amount.toLocaleString()} ${config.economy.currency.symbol}, but you only have ${user.safe_balance.toLocaleString()} ${config.economy.currency.symbol} in your safe`,
          );
        }

        // Check for wallet limit
        const newWalletBalance = user.balance + amount;
        if (
          config.economy.currency.maxWalletAmount !==
            Number.POSITIVE_INFINITY &&
          newWalletBalance > config.economy.currency.maxWalletAmount
        ) {
          throw new Error(
            `Your wallet cannot hold more than ${config.economy.currency.maxWalletAmount.toLocaleString()} ${config.economy.currency.symbol}`,
          );
        }

        // Update balances
        const newSafeBalance = user.safe_balance - amount;

        await this.client.database.updateUser(userId, {
          balance: newWalletBalance,
          safe_balance: newSafeBalance,
        });

        // Log transaction
        await this.client.database.logTransaction(
          userId,
          "withdraw",
          amount,
          "Withdraw from safe",
        );

        return { wallet: newWalletBalance, safe: newSafeBalance };
      });
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message.includes("Insufficient safe balance") ||
          error.message.includes("Your wallet cannot hold"))
      ) {
        throw error;
      }
      this.client.logger.error(
        `Error withdrawing from safe for user ${userId}:`,
        error,
      );
      throw new Error("An error occurred while withdrawing from your safe");
    }
  }

  async upgradeSafe(
    userId: string,
  ): Promise<{ tier: number; capacity: number; cost: number }> {
    try {
      return await this.client.database.transaction(async () => {
        // Ensure user exists
        await this.client.database.createUser(userId);

        // Get user data
        const user = await this.client.database.getUser(userId);

        // Calculate upgrade cost
        const currentTier = user.safe_tier;
        const nextTier = currentTier + 1;
        const upgradeCost = Math.floor(
          config.economy.safe.baseCost *
            Math.pow(config.economy.safe.upgradeMultiplier, currentTier - 1),
        );

        // Check if user has enough balance
        if (user.balance < upgradeCost) {
          throw new Error(
            `Insufficient balance. Safe upgrade costs ${upgradeCost.toLocaleString()} ${config.economy.currency.symbol}, but you only have ${user.balance.toLocaleString()} ${config.economy.currency.symbol}`,
          );
        }

        // Calculate new capacity
        const newCapacity =
          config.economy.safe.baseCapacity +
          (nextTier - 1) * config.economy.safe.capacityIncreasePerTier;

        // Update user
        await this._removeBalanceInternal(userId, upgradeCost, "Safe upgrade");
        await this.client.database.updateUser(userId, {
          safe_tier: nextTier,
          safe_capacity: newCapacity,
        });

        return { tier: nextTier, capacity: newCapacity, cost: upgradeCost };
      });
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("Insufficient balance")
      ) {
        throw error;
      }
      this.client.logger.error(
        `Error upgrading safe for user ${userId}:`,
        error,
      );
      throw new Error("An error occurred while upgrading your safe");
    }
  }

  // Helper method to add XP without circular dependency
  private async addXP(
    userId: string,
    amount: number,
    source: string,
  ): Promise<{
    level: number;
    xp: number;
    requiredXP: number;
    leveledUp: boolean;
    newLevel?: number;
  }> {
    return await this.client.database.transaction(async () => {
      return await this._addXPInternal(userId, amount, source);
    });
  }

  // Internal XP method that doesn't start a transaction
  public async _addXPInternal(
    userId: string,
    amount: number,
    source: string,
  ): Promise<{
    level: number;
    xp: number;
    requiredXP: number;
    leveledUp: boolean;
    newLevel?: number;
  }> {
    // Ensure user exists
    await this.client.database.createUser(userId);

    // Get current level data
    const user = await this.client.database.getUser(userId);
    const currentLevel = user.level;
    const currentXP = user.xp;
    const requiredXP = this.calculateRequiredXP(currentLevel);

    // Add XP
    const newXP = currentXP + amount;
    let newLevel = currentLevel;
    let leveledUp = false;

    // Check for level up
    if (newXP >= requiredXP && currentLevel < config.leveling.maxLevel) {
      newLevel = currentLevel + 1;
      leveledUp = true;

      // Award level up bonus
      await this._addBalanceInternal(
        userId,
        config.leveling.levelUpBonus,
        `Level up bonus (Level ${newLevel})`,
      );
    }

    // Update user
    await this.client.database.updateUser(userId, {
      level: newLevel,
      xp: newXP,
    });

    // Log XP gain
    await this.client.database.logTransaction(
      userId,
      "xp",
      amount,
      `XP from ${source}`,
    );

    return {
      level: newLevel,
      xp: newXP,
      requiredXP: this.calculateRequiredXP(newLevel),
      leveledUp,
      newLevel: leveledUp ? newLevel : undefined,
    };
  }

  // Calculate XP required for a specific level
  private calculateRequiredXP(level: number): number {
    return Math.floor(
      config.leveling.baseXP *
        Math.pow(config.leveling.xpMultiplier, level - 1),
    );
  }

  // Time-based rewards
  async claimDaily(
    userId: string,
  ): Promise<{ amount: number; streak: number }> {
    try {
      return await this.client.database.transaction(async () => {
        // Ensure user exists first
        await this.client.database.createUser(userId);

        // Check if already claimed
        const claim = await this.client.database.get(
          "SELECT * FROM claims WHERE user_id = ? AND claim_type = 'daily'",
          [userId],
        );

        const now = Date.now();

        if (claim) {
          const lastClaimed = new Date(claim.last_claimed).getTime();
          const timeSinceClaim = now - lastClaimed;

          // Check if 24 hours have passed
          if (timeSinceClaim < 24 * 60 * 60 * 1000) {
            const timeLeft = 24 * 60 * 60 * 1000 - timeSinceClaim;
            const hours = Math.floor(timeLeft / (1000 * 60 * 60));
            const minutes = Math.floor(
              (timeLeft % (1000 * 60 * 60)) / (1000 * 60),
            );
            throw new Error(
              `You can claim your daily reward in ${hours}h ${minutes}m`,
            );
          }

          // Check if streak should continue (within 48 hours of last claim)
          let streak = claim.streak;
          if (timeSinceClaim < 48 * 60 * 60 * 1000) {
            streak += 1;
          } else {
            streak = 1; // Reset streak
          }

          // Calculate reward with streak bonus
          let amount = config.economy.daily.amount;
          if (config.economy.daily.streak.enabled) {
            const streakMultiplier = Math.min(
              streak * config.economy.daily.streak.multiplier,
              config.economy.daily.streak.maxMultiplier,
            );
            amount = Math.floor(amount * (1 + streakMultiplier));
          }

          // Update claim
          await this.client.database.run(
            "UPDATE claims SET last_claimed = ?, streak = ? WHERE user_id = ? AND claim_type = 'daily'",
            [now, streak, userId],
          );

          // Add balance and XP using internal methods
          await this._addBalanceInternal(userId, amount, "Daily reward");
          await this._addXPInternal(
            userId,
            config.economy.daily.xpReward,
            "Daily reward",
          );

          return { amount, streak };
        } else {
          // First time claiming
          await this.client.database.run(
            "INSERT INTO claims (user_id, claim_type, last_claimed, streak) VALUES (?, ?, ?, ?)",
            [userId, "daily", now, 1],
          );

          // Add balance and XP using internal methods
          await this._addBalanceInternal(
            userId,
            config.economy.daily.amount,
            "Daily reward",
          );
          await this._addXPInternal(
            userId,
            config.economy.daily.xpReward,
            "Daily reward",
          );

          return { amount: config.economy.daily.amount, streak: 1 };
        }
      });
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("You can claim your daily reward in")
      ) {
        throw error;
      }
      this.client.logger.error(
        `Error claiming daily reward for user ${userId}:`,
        error,
      );
      throw new Error("An error occurred while claiming your daily reward");
    }
  }

  async getDailyStatus(
    userId: string,
  ): Promise<{ claimed: boolean; timeLeft: number; streak: number }> {
    try {
      // Ensure user exists
      await this.client.database.createUser(userId);

      const claim = await this.client.database.get(
        "SELECT * FROM claims WHERE user_id = ? AND claim_type = 'daily'",
        [userId],
      );

      if (!claim) {
        return { claimed: false, timeLeft: 0, streak: 0 };
      }

      const lastClaimed = new Date(claim.last_claimed).getTime();
      const now = Date.now();
      const timeSinceClaim = now - lastClaimed;
      const timeLeft = Math.max(0, 24 * 60 * 60 * 1000 - timeSinceClaim);

      return {
        claimed: timeLeft > 0,
        timeLeft,
        streak: claim.streak,
      };
    } catch (error) {
      this.client.logger.error(
        `Error getting daily status for user ${userId}:`,
        error,
      );
      throw new Error(
        "An error occurred while checking your daily reward status",
      );
    }
  }

  // Weekly claim
  async claimWeekly(userId: string): Promise<{ amount: number }> {
    try {
      return await this.client.database.transaction(async () => {
        // Ensure user exists first
        await this.client.database.createUser(userId);

        // Check if already claimed
        const claim = await this.client.database.get(
          "SELECT * FROM claims WHERE user_id = ? AND claim_type = 'weekly'",
          [userId],
        );

        const now = Date.now();

        if (claim) {
          const lastClaimed = new Date(claim.last_claimed).getTime();
          const timeSinceClaim = now - lastClaimed;

          // Check if 7 days have passed
          if (timeSinceClaim < 7 * 24 * 60 * 60 * 1000) {
            const timeLeft = 7 * 24 * 60 * 60 * 1000 - timeSinceClaim;
            const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
            const hours = Math.floor(
              (timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
            );
            throw new Error(
              `You can claim your weekly reward in ${days}d ${hours}h`,
            );
          }

          // Update claim
          await this.client.database.run(
            "UPDATE claims SET last_claimed = ? WHERE user_id = ? AND claim_type = 'weekly'",
            [now, userId],
          );
        } else {
          // First time claiming
          await this.client.database.run(
            "INSERT INTO claims (user_id, claim_type, last_claimed) VALUES (?, ?, ?)",
            [userId, "weekly", now],
          );
        }

        // Add balance and XP using internal methods
        await this._addBalanceInternal(
          userId,
          config.economy.weekly.amount,
          "Weekly reward",
        );
        await this._addXPInternal(
          userId,
          config.economy.weekly.xpReward,
          "Weekly reward",
        );

        return { amount: config.economy.weekly.amount };
      });
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("You can claim your weekly reward in")
      ) {
        throw error;
      }
      this.client.logger.error(
        `Error claiming weekly reward for user ${userId}:`,
        error,
      );
      throw new Error("An error occurred while claiming your weekly reward");
    }
  }

  async getWeeklyStatus(
    userId: string,
  ): Promise<{ claimed: boolean; timeLeft: number }> {
    try {
      // Ensure user exists
      await this.client.database.createUser(userId);

      const claim = await this.client.database.get(
        "SELECT * FROM claims WHERE user_id = ? AND claim_type = 'weekly'",
        [userId],
      );

      if (!claim) {
        return { claimed: false, timeLeft: 0 };
      }

      const lastClaimed = new Date(claim.last_claimed).getTime();
      const now = Date.now();
      const timeSinceClaim = now - lastClaimed;
      const timeLeft = Math.max(0, 7 * 24 * 60 * 60 * 1000 - timeSinceClaim);

      return {
        claimed: timeLeft > 0,
        timeLeft,
      };
    } catch (error) {
      this.client.logger.error(
        `Error getting weekly status for user ${userId}:`,
        error,
      );
      throw new Error(
        "An error occurred while checking your weekly reward status",
      );
    }
  }

  // Monthly claim
  async claimMonthly(userId: string): Promise<{ amount: number }> {
    try {
      return await this.client.database.transaction(async () => {
        // Ensure user exists first
        await this.client.database.createUser(userId);

        // Check if already claimed
        const claim = await this.client.database.get(
          "SELECT * FROM claims WHERE user_id = ? AND claim_type = 'monthly'",
          [userId],
        );

        const now = Date.now();

        if (claim) {
          const lastClaimed = new Date(claim.last_claimed).getTime();
          const timeSinceClaim = now - lastClaimed;

          // Check if 30 days have passed (approximation for a month)
          if (timeSinceClaim < 30 * 24 * 60 * 60 * 1000) {
            const timeLeft = 30 * 24 * 60 * 60 * 1000 - timeSinceClaim;
            const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
            throw new Error(
              `You can claim your monthly reward in ${days} days`,
            );
          }

          // Update claim
          await this.client.database.run(
            "UPDATE claims SET last_claimed = ? WHERE user_id = ? AND claim_type = 'monthly'",
            [now, userId],
          );
        } else {
          // First time claiming
          await this.client.database.run(
            "INSERT INTO claims (user_id, claim_type, last_claimed) VALUES (?, ?, ?)",
            [userId, "monthly", now],
          );
        }

        // Add balance and XP using internal methods
        await this._addBalanceInternal(
          userId,
          config.economy.monthly.amount,
          "Monthly reward",
        );
        await this._addXPInternal(
          userId,
          config.economy.monthly.xpReward,
          "Monthly reward",
        );

        return { amount: config.economy.monthly.amount };
      });
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("You can claim your monthly reward in")
      ) {
        throw error;
      }
      this.client.logger.error(
        `Error claiming monthly reward for user ${userId}:`,
        error,
      );
      throw new Error("An error occurred while claiming your monthly reward");
    }
  }

  async getMonthlyStatus(
    userId: string,
  ): Promise<{ claimed: boolean; timeLeft: number }> {
    try {
      // Ensure user exists
      await this.client.database.createUser(userId);

      const claim = await this.client.database.get(
        "SELECT * FROM claims WHERE user_id = ? AND claim_type = 'monthly'",
        [userId],
      );

      if (!claim) {
        return { claimed: false, timeLeft: 0 };
      }

      const lastClaimed = new Date(claim.last_claimed).getTime();
      const now = Date.now();
      const timeSinceClaim = now - lastClaimed;
      const timeLeft = Math.max(0, 30 * 24 * 60 * 60 * 1000 - timeSinceClaim);

      return {
        claimed: timeLeft > 0,
        timeLeft,
      };
    } catch (error) {
      this.client.logger.error(
        `Error getting monthly status for user ${userId}:`,
        error,
      );
      throw new Error(
        "An error occurred while checking your monthly reward status",
      );
    }
  }

  // Yearly claim
  async claimYearly(userId: string): Promise<{ amount: number }> {
    try {
      return await this.client.database.transaction(async () => {
        // Ensure user exists first
        await this.client.database.createUser(userId);

        // Check if already claimed
        const claim = await this.client.database.get(
          "SELECT * FROM claims WHERE user_id = ? AND claim_type = 'yearly'",
          [userId],
        );

        const now = Date.now();

        if (claim) {
          const lastClaimed = new Date(claim.last_claimed).getTime();
          const timeSinceClaim = now - lastClaimed;

          // Check if 365 days have passed (approximation for a year)
          if (timeSinceClaim < 365 * 24 * 60 * 60 * 1000) {
            const timeLeft = 365 * 24 * 60 * 60 * 1000 - timeSinceClaim;
            const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
            throw new Error(`You can claim your yearly reward in ${days} days`);
          }

          // Update claim
          await this.client.database.run(
            "UPDATE claims SET last_claimed = ? WHERE user_id = ? AND claim_type = 'yearly'",
            [now, userId],
          );
        } else {
          // First time claiming
          await this.client.database.run(
            "INSERT INTO claims (user_id, claim_type, last_claimed) VALUES (?, ?, ?)",
            [userId, "yearly", now],
          );
        }

        // Add balance and XP using internal methods
        await this._addBalanceInternal(
          userId,
          config.economy.yearly.amount,
          "Yearly reward",
        );
        await this._addXPInternal(
          userId,
          config.economy.yearly.xpReward,
          "Yearly reward",
        );

        return { amount: config.economy.yearly.amount };
      });
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("You can claim your yearly reward in")
      ) {
        throw error;
      }
      this.client.logger.error(
        `Error claiming yearly reward for user ${userId}:`,
        error,
      );
      throw new Error("An error occurred while claiming your yearly reward");
    }
  }

  async getYearlyStatus(
    userId: string,
  ): Promise<{ claimed: boolean; timeLeft: number }> {
    try {
      // Ensure user exists
      await this.client.database.createUser(userId);

      const claim = await this.client.database.get(
        "SELECT * FROM claims WHERE user_id = ? AND claim_type = 'yearly'",
        [userId],
      );

      if (!claim) {
        return { claimed: false, timeLeft: 0 };
      }

      const lastClaimed = new Date(claim.last_claimed).getTime();
      const now = Date.now();
      const timeSinceClaim = now - lastClaimed;
      const timeLeft = Math.max(0, 365 * 24 * 60 * 60 * 1000 - timeSinceClaim);

      return {
        claimed: timeLeft > 0,
        timeLeft,
      };
    } catch (error) {
      this.client.logger.error(
        `Error getting yearly status for user ${userId}:`,
        error,
      );
      throw new Error(
        "An error occurred while checking your yearly reward status",
      );
    }
  }
}
