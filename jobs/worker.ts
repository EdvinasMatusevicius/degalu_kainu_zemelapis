import { schedule } from 'node-cron'
import { scrapeFuelPrices } from './scrapeFuelPrices'

console.log('[worker] Starting...')

// Every minute — tighten this for production
schedule('* * * * *', async () => {
  console.log('[worker] Running scrape job...')
  try {
    await scrapeFuelPrices()
  } catch (err) {
    console.error('[worker] Job failed:', err)
  }
})

console.log('[worker] Cron scheduled, waiting...')
