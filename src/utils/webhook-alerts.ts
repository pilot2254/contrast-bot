import { logger } from "./logger"
import { config } from "./config"

interface WebhookAlert {
  title: string
  description: string
  color: number
  fields?: Array<{ name: string; value: string; inline?: boolean }>
  timestamp?: string
}

export async function sendWebhookAlert(alert: WebhookAlert): Promise<void> {
  const webhookUrl = process.env.DEVELOPER_WEBHOOK_URL

  if (!webhookUrl) {
    logger.debug("No webhook URL configured, skipping alert")
    return
  }

  try {
    const embed = {
      title: alert.title,
      description: alert.description,
      color: alert.color,
      fields: alert.fields || [],
      timestamp: alert.timestamp || new Date().toISOString(),
      footer: {
        text: `${config.botName} Developer Alert`,
      },
    }

    const payload = {
      embeds: [embed],
    }

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      logger.error(`Webhook alert failed: ${response.status} ${response.statusText}`)
    } else {
      logger.debug("Webhook alert sent successfully")
    }
  } catch (error) {
    logger.error("Failed to send webhook alert:", error)
  }
}

export const WEBHOOK_COLORS = {
  INFO: 0x3498db,
  SUCCESS: 0x2ecc71,
  WARNING: 0xf39c12,
  ERROR: 0xe74c3c,
  CRITICAL: 0x992d22,
}
