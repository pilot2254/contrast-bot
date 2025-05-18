import fs from "fs"
import path from "path"
import { logger } from "./logger"

// This file was used for the initial migration of commands to the folder structure
// Now that the migration is complete, this file can be considered for deletion
// However, I'll keep it for now as it might be useful for future migrations or as a reference
// If you want to delete it completely, you can do so manually

// Define the categories
const CATEGORIES = ["Utility", "Moderation", "Developer", "Fun", "Miscellaneous"]

// Function to ensure directory exists
function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
    logger.info(`Created directory: ${dir}`)
  }
}

// Function to extract category from a command file
function extractCategory(filePath: string): string {
  try {
    const content = fs.readFileSync(filePath, "utf8")

    // Look for export const category = "..."
    const categoryMatch = content.match(/export\s+const\s+category\s*=\s*["']([^"']+)["']/)
    if (categoryMatch && categoryMatch[1]) {
      return categoryMatch[1]
    }

    // Default to Miscellaneous if no category found
    return "Miscellaneous"
  } catch (error) {
    logger.error(`Error reading file ${filePath}:`, error)
    return "Miscellaneous"
  }
}

// Function to migrate commands
async function migrateCommands() {
  const commandsDir = path.join(__dirname, "..", "commands")

  // Ensure commands directory exists
  if (!fs.existsSync(commandsDir)) {
    logger.error(`Commands directory not found: ${commandsDir}`)
    return
  }

  // Create category directories
  for (const category of CATEGORIES) {
    ensureDir(path.join(commandsDir, category))
  }

  // Get all command files in the root directory
  const commandFiles = fs
    .readdirSync(commandsDir)
    .filter(
      (file) => (file.endsWith(".js") || file.endsWith(".ts")) && fs.statSync(path.join(commandsDir, file)).isFile(),
    )

  if (commandFiles.length === 0) {
    logger.info("No command files found in the root directory. Migration may have already been completed.")
    return
  }

  // Process each command file
  for (const file of commandFiles) {
    const filePath = path.join(commandsDir, file)

    // Extract category from file
    const category = extractCategory(filePath)

    // Ensure the category is valid
    const targetCategory = CATEGORIES.includes(category) ? category : "Miscellaneous"

    // Create target path
    const targetPath = path.join(commandsDir, targetCategory, file)

    // Move the file
    try {
      fs.renameSync(filePath, targetPath)
      logger.info(`Moved ${file} to ${targetCategory}/ directory`)
    } catch (error) {
      logger.error(`Error moving ${file}:`, error)
    }
  }

  logger.info("Command migration completed!")
}

// Run the migration
migrateCommands().catch((error) => {
  logger.error("Migration failed:", error)
})