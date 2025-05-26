// Rate limiter for commands
const userCooldowns = new Map<string, Map<string, number>>()

export interface RateLimitConfig {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Max requests per window
}

export const RATE_LIMITS = {
  GAMBLING: { windowMs: 2000, maxRequests: 1 }, // 1 request per 2 seconds for gambling
  GENERAL: { windowMs: 1000, maxRequests: 3 }, // 3 requests per second for general commands
  REWARD: { windowMs: 10000, maxRequests: 1 }, // 1 request per 10 seconds for reward commands
}

export function checkRateLimit(userId: string, commandName: string, config: RateLimitConfig): boolean {
  const now = Date.now()

  if (!userCooldowns.has(userId)) {
    userCooldowns.set(userId, new Map())
  }

  const userCommands = userCooldowns.get(userId)!
  const lastUsed = userCommands.get(commandName) || 0

  // Check if enough time has passed
  if (now - lastUsed < config.windowMs) {
    return false // Rate limited
  }

  // Update the timestamp ONLY when the command is actually executed
  // This will be called from the interaction handler after rate limit check passes
  return true // Not rate limited
}

export function updateRateLimit(userId: string, commandName: string): void {
  const now = Date.now()

  if (!userCooldowns.has(userId)) {
    userCooldowns.set(userId, new Map())
  }

  const userCommands = userCooldowns.get(userId)!
  userCommands.set(commandName, now)

  // Clean up old entries periodically
  if (Math.random() < 0.01) {
    // 1% chance to clean up
    cleanupOldEntries()
  }
}

function cleanupOldEntries(): void {
  const now = Date.now()
  const maxAge = 300000 // 5 minutes

  for (const [userId, commands] of userCooldowns.entries()) {
    for (const [command, timestamp] of commands.entries()) {
      if (now - timestamp > maxAge) {
        commands.delete(command)
      }
    }

    if (commands.size === 0) {
      userCooldowns.delete(userId)
    }
  }
}

export function getRemainingCooldown(userId: string, commandName: string, config: RateLimitConfig): number {
  const userCommands = userCooldowns.get(userId)
  if (!userCommands) return 0

  const lastUsed = userCommands.get(commandName) || 0
  const remaining = config.windowMs - (Date.now() - lastUsed)

  return Math.max(0, remaining)
}

// Clear rate limit for a specific user and command (useful for debugging)
export function clearRateLimit(userId: string, commandName?: string): void {
  const userCommands = userCooldowns.get(userId)
  if (!userCommands) return

  if (commandName) {
    userCommands.delete(commandName)
  } else {
    userCooldowns.delete(userId)
  }
}
