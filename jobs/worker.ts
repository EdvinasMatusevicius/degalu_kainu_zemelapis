import { schedule } from 'node-cron'
import { scrapeFuelPrices } from './scrapeFuelPrices'
import { logger } from './logger'

let retryAfter = 0

// Every minute — tighten this for production
schedule('* * * * *', async () => {
  if (Date.now() < retryAfter) return

  try {
    await scrapeFuelPrices()
  } catch (err) {
    logger.error({ err }, 'Scrape job failed, retrying in 30 minutes')
    retryAfter = Date.now() + 30 * 60 * 1000
  }
})
