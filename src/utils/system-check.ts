import { logger } from "./logger"
import { getDb, initDatabase } from "./database"
import { initSafeManager } from "./safe-manager"
import { initShopManager } from "./shop-manager"
import { initEconomyManager } from "./economy-manager"
import { initGamblingManager } from "./gambling-manager"

export async function performSystemCheck(): Promise<boolean> {
  try {
    logger.info("🔍 Starting comprehensive system check...")

    // 1. Database Check
    logger.info("📊 Checking database connection...")
    await initDatabase()
    const db = getDb()

    // Test basic database operations
    await db.get("SELECT 1")
    logger.info("✅ Database connection successful")

    // 2. Check all required tables exist
    const requiredTables = [
      "user_economy",
      "transactions",
      "gambling_stats",
      "user_levels",
      "user_safes",
      "shop_items",
      "user_purchases",
      "bot_settings",
      "stats",
      "blacklisted_users",
      "quotes",
      "reputation",
      "feedback",
    ]

    for (const table of requiredTables) {
      const result = await db.get("SELECT name FROM sqlite_master WHERE type='table' AND name=?", table)
      if (!result) {
        throw new Error(`Required table '${table}' not found`)
      }
    }
    logger.info("✅ All required database tables exist")

    // 3. Initialize all managers
    logger.info("🔧 Initializing system managers...")
    await initEconomyManager()
    await initGamblingManager()
    await initSafeManager()
    await initShopManager()
    logger.info("✅ All managers initialized successfully")

    // 4. Check shop items exist
    const shopItems = await db.all("SELECT COUNT(*) as count FROM shop_items WHERE is_active = 1")
    if (shopItems[0].count === 0) {
      throw new Error("No active shop items found")
    }
    logger.info(`✅ Found ${shopItems[0].count} active shop items`)

    // 5. Test economy operations (fixed foreign key issue)
    logger.info("💰 Testing economy operations...")
    const testUserId = "test_user_" + Date.now()

    // Test user creation
    const { getOrCreateUserEconomy, addCurrency, removeCurrency, TRANSACTION_TYPES } = await import("./economy-manager")

    // Create user first
    const user = await getOrCreateUserEconomy(testUserId, "TestUser")
    logger.info("✅ Test user created successfully")

    // Test currency operations
    await addCurrency(testUserId, "TestUser", 1000, TRANSACTION_TYPES.ADMIN_ADD, "System test")
    const updatedUser = await getOrCreateUserEconomy(testUserId, "TestUser")

    if (updatedUser.balance !== 1000) {
      throw new Error("Currency addition failed")
    }

    await removeCurrency(testUserId, "TestUser", 500, TRANSACTION_TYPES.ADMIN_REMOVE, "System test")
    const finalUser = await getOrCreateUserEconomy(testUserId, "TestUser")

    if (finalUser.balance !== 500) {
      throw new Error("Currency removal failed")
    }

    logger.info("✅ Economy operations working correctly")

    // 6. Test safe operations (fixed foreign key issue)
    logger.info("🔒 Testing safe operations...")
    const { getOrCreateUserSafe, depositToSafe, withdrawFromSafe } = await import("./safe-manager")

    const testUser2 = "test_safe_" + Date.now()

    // Create economy user first (required for foreign key)
    await getOrCreateUserEconomy(testUser2, "TestSafeUser")
    await addCurrency(testUser2, "TestSafeUser", 1000, TRANSACTION_TYPES.ADMIN_ADD, "Safe test")

    const safe = await getOrCreateUserSafe(testUser2, "TestSafeUser")
    if (safe.capacity !== 10000) {
      throw new Error("Default safe capacity incorrect")
    }

    const depositResult = await depositToSafe(testUser2, "TestSafeUser", 500)
    if (!depositResult.success) {
      throw new Error("Safe deposit failed: " + depositResult.message)
    }

    const withdrawResult = await withdrawFromSafe(testUser2, "TestSafeUser", 250)
    if (!withdrawResult.success) {
      throw new Error("Safe withdrawal failed: " + withdrawResult.message)
    }

    logger.info("✅ Safe operations working correctly")

    // 7. Cleanup test data (in correct order to avoid foreign key constraints)
    logger.info("🧹 Cleaning up test data...")

    // Delete in reverse order of dependencies
    await db.run("DELETE FROM transactions WHERE user_id IN (?, ?)", testUserId, testUser2)
    await db.run("DELETE FROM user_safes WHERE user_id IN (?, ?)", testUserId, testUser2)
    await db.run("DELETE FROM gambling_stats WHERE user_id IN (?, ?)", testUserId, testUser2)
    await db.run("DELETE FROM user_levels WHERE user_id IN (?, ?)", testUserId, testUser2)
    await db.run("DELETE FROM user_economy WHERE user_id IN (?, ?)", testUserId, testUser2)

    logger.info("✅ Test data cleaned up")

    logger.info("🎉 System check completed successfully! All systems operational.")
    return true
  } catch (error) {
    logger.error("❌ System check failed:", error)

    // Cleanup on error
    try {
      const db = getDb()
      await db.run("DELETE FROM transactions WHERE user_id LIKE 'test_%'")
      await db.run("DELETE FROM user_safes WHERE user_id LIKE 'test_%'")
      await db.run("DELETE FROM gambling_stats WHERE user_id LIKE 'test_%'")
      await db.run("DELETE FROM user_levels WHERE user_id LIKE 'test_%'")
      await db.run("DELETE FROM user_economy WHERE user_id LIKE 'test_%'")
      logger.info("🧹 Cleaned up test data after error")
    } catch (cleanupError) {
      logger.error("Failed to cleanup test data:", cleanupError)
    }

    return false
  }
}

// Run system check if this file is executed directly
if (require.main === module) {
  performSystemCheck().then((success) => {
    process.exit(success ? 0 : 1)
  })
}
