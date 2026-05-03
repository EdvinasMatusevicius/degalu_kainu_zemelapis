import { schedule } from 'node-cron'
import { max } from 'drizzle-orm'
import { scrapeFuelPrices } from './scrapeFuelPrices'
import { updateCoordinatesFromCatalog } from './coordinates'
import { logger } from './logger'
import { db } from '../src/lib/db'
import { fuelPrices } from '../src/lib/schema'

// Retry delays after a stale/failed scrape — total window ~12 hours
const RETRY_DELAYS_MS = [
  30 * 60 * 1000,        // retry 1: +30 min
  60 * 60 * 1000,        // retry 2: +1h   (cumulative: 1h30m)
  2 * 60 * 60 * 1000,    // retry 3: +2h   (cumulative: 3h30m)
  4 * 60 * 60 * 1000,    // retry 4: +4h   (cumulative: 7h30m)
  4.5 * 60 * 60 * 1000,  // retry 5: +4.5h (cumulative: 12h)
]

type WorkerState =
  | { kind: 'scheduled'; runAt: number }
  | { kind: 'retrying'; nextRetryIndex: number; nextRetryAt: number }

function nextElevenAM(): number {
  const d = new Date()
  d.setHours(11, 0, 0, 0)
  if (d.getTime() <= Date.now()) d.setDate(d.getDate() + 1)
  return d.getTime()
}

function scheduleNextRetry(nextIndex: number): void {
  const next11 = nextElevenAM()

  if (nextIndex >= RETRY_DELAYS_MS.length) {
    logger.warn(`[worker] All retries exhausted — next scrape at 11:00 (${new Date(next11).toISOString()})`)
    state = { kind: 'scheduled', runAt: next11 }
    return
  }

  const retryAt = Date.now() + RETRY_DELAYS_MS[nextIndex]
  if (retryAt >= next11) {
    // Retry window overlaps next 11:00 — cut short and let 11:00 be the next attempt
    logger.info(`[worker] Retry ${nextIndex + 1} would fall after 11:00 — scheduling at 11:00 instead (${new Date(next11).toISOString()})`)
    state = { kind: 'scheduled', runAt: next11 }
  } else {
    const mins = Math.round(RETRY_DELAYS_MS[nextIndex] / 60000)
    logger.info(`[worker] Retry ${nextIndex + 1}/${RETRY_DELAYS_MS.length} in ${mins} min (${new Date(retryAt).toISOString()})`)
    state = { kind: 'retrying', nextRetryIndex: nextIndex + 1, nextRetryAt: retryAt }
  }
}

// Run immediately on boot
let state: WorkerState = { kind: 'retrying', nextRetryIndex: 0, nextRetryAt: Date.now() }

updateCoordinatesFromCatalog()
  .catch((err: unknown) => logger.error({ err }, 'Startup coordinate sync failed'))

let running = false

schedule('* * * * *', async () => {
  if (running) return

  const now = Date.now()
  const dueAt = state.kind === 'scheduled' ? state.runAt : state.nextRetryAt
  if (now < dueAt) return

  running = true
  try {
    await runScrape()
  } finally {
    running = false
  }
})

async function isTodayInDb(): Promise<boolean> {
  const today = new Date().toISOString().split('T')[0]
  const [{ latest }] = await db.select({ latest: max(fuelPrices.priceDate) }).from(fuelPrices)
  return latest === today
}

async function runScrape(): Promise<void> {
  try {
    await scrapeFuelPrices()

    if (await isTodayInDb()) {
      const next11 = nextElevenAM()
      logger.info(`[worker] Prices up to date — next scrape at 11:00 (${new Date(next11).toISOString()})`)
      state = { kind: 'scheduled', runAt: next11 }
    } else {
      const nextIndex = state.kind === 'retrying' ? state.nextRetryIndex : 0
      logger.warn(`[worker] Data stale — scheduling retry ${nextIndex + 1}/${RETRY_DELAYS_MS.length}`)
      scheduleNextRetry(nextIndex)
    }
  } catch (err) {
    logger.error({ err }, '[worker] Scrape failed')
    const nextIndex = state.kind === 'retrying' ? state.nextRetryIndex : 0
    scheduleNextRetry(nextIndex)
  }
}
