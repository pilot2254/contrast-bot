import { ExtendedClient } from "./structures/ExtendedClient"
import * as dotenv from "dotenv"

// Load environment variables
dotenv.config()

// Create and start the client
const client = ExtendedClient.createClient()

// Start the bot
client.start(process.env.DISCORD_TOKEN || "")
