import { db } from '../src/lib/db'
import { plots } from '../src/lib/schema'

export async function scrapeFuelPrices(): Promise<void> {
  console.log('[scraper] Fetching test data...')

  const res = await fetch('https://httpbin.org/get')
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`)

  const data = await res.json() as { origin: string }

  await db.insert(plots).values({
    name: `fuel-scrape-${Date.now()}`,
    description: `Test scrape at ${new Date().toISOString()} from ${data.origin}`,
  })

  console.log('[scraper] Inserted record successfully')
}
