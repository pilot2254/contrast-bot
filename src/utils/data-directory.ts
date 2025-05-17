import fs from "fs"
import path from "path"
import { logger } from "./logger"

// Base data directory path
const DATA_DIR = path.join(process.cwd(), "data")

/**
 * Ensures the data directory exists
 */
export function ensureDataDirectory(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true })
      logger.info(`Created data directory at ${DATA_DIR}`)
    }
  } catch (error) {
    logger.error("Failed to create data directory:", error)
    throw error
  }
}

/**
 * Gets the path to a data file
 * @param filename The name of the data file
 * @returns The full path to the data file
 */
export function getDataFilePath(filename: string): string {
  return path.join(DATA_DIR, filename)
}

/**
 * Loads data from a JSON file
 * @param filename The name of the data file
 * @param defaultData The default data to use if the file doesn't exist
 * @returns The loaded data
 */
export function loadJsonData<T>(filename: string, defaultData: T): T {
  const filePath = getDataFilePath(filename)

  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, "utf8")
      return JSON.parse(data) as T
    } else {
      return defaultData
    }
  } catch (error) {
    logger.error(`Failed to load data from ${filePath}:`, error)
    return defaultData
  }
}

/**
 * Saves data to a JSON file
 * @param filename The name of the data file
 * @param data The data to save
 */
export function saveJsonData<T>(filename: string, data: T): void {
  const filePath = getDataFilePath(filename)

  try {
    const jsonData = JSON.stringify(data, null, 2)
    fs.writeFileSync(filePath, jsonData, "utf8")
  } catch (error) {
    logger.error(`Failed to save data to ${filePath}:`, error)
  }
}
