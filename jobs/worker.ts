import { schedule } from 'node-cron'
import { max } from 'drizzle-orm'
import { scrapeFuelPrices } from './scrapeFuelPrices'
import { updateCoordinatesFromCatalog } from './coordinates'
import { logger } from './logger'
import { db } from '../src/lib/db'
import { fuelPrices } from '../src/lib/schema'

const CHAIN_START_HOUR = 11
const RETRY_INTERVAL_MS = 30 * 60 * 1000
const MAX_CHAIN_ATTEMPTS = 8

type WorkerState =
  | { kind: 'waiting'; runAt: number }
  | { kind: 'in-chain'; runAt: number; attemptsLeft: number }

let state: WorkerState = { kind: 'waiting', runAt: Number.POSITIVE_INFINITY }
let scraping = false

function isWeekend(d: Date): boolean {
  const day = d.getDay()
  return day === 0 || day === 6
}

function fmtLT(d: Date): string {
  return d.toLocaleString('sv-SE', { timeZone: 'Europe/Vilnius' })
}

function todayAtChainStart(): Date {
  const d = new Date()
  d.setHours(CHAIN_START_HOUR, 0, 0, 0)
  return d
}

function nextWeekdayAtChainStart(): Date {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  d.setHours(CHAIN_START_HOUR, 0, 0, 0)
  while (isWeekend(d)) {
    d.setDate(d.getDate() + 1)
  }
  return d
}

function scheduleNextChain(): void {
  const at = nextWeekdayAtChainStart()
  logger.info(`[worker] Next chain at ${fmtLT(at)}`)
  state = { kind: 'waiting', runAt: at.getTime() }
}

function startTodayChain(): void {
  const now = Date.now()
  const today11 = todayAtChainStart().getTime()
  const nextSlotIndex = now <= today11 ? 0 : Math.ceil((now - today11) / RETRY_INTERVAL_MS)
  const attemptsLeft = MAX_CHAIN_ATTEMPTS - nextSlotIndex

  if (attemptsLeft <= 0) {
    logger.info('[worker] Today\'s chain window already past — rolling over to next weekday')
    scheduleNextChain()
    return
  }

  const nextSlotTime = today11 + nextSlotIndex * RETRY_INTERVAL_MS
  logger.info(`[worker] Today's chain: ${attemptsLeft} attempts left, next at ${fmtLT(new Date(nextSlotTime))}`)
  state = { kind: 'in-chain', runAt: nextSlotTime, attemptsLeft }
}

async function isTodayInDb(): Promise<boolean> {
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Vilnius' })
  const [{ latest }] = await db.select({ latest: max(fuelPrices.priceDate) }).from(fuelPrices)
  return latest === today
}

async function bootstrap(): Promise<void> {
  if (await isTodayInDb()) {
    logger.info('[worker] DB already has today\'s prices — skipping initial scrape')
    scheduleNextChain()
    return
  }

  logger.info('[worker] DB stale or empty — running initial scrape')
  try {
    await scrapeFuelPrices()
  } catch (err) {
    logger.error({ err }, '[worker] Initial scrape failed')
  }

  if (await isTodayInDb()) {
    logger.info('[worker] Initial scrape succeeded')
    scheduleNextChain()
    return
  }

  logger.warn('[worker] Initial scrape did not produce today\'s data')
  if (isWeekend(new Date())) {
    scheduleNextChain()
  } else {
    startTodayChain()
  }
}

async function tick(): Promise<void> {
  if (scraping) return
  if (Date.now() < state.runAt) return

  scraping = true
  try {
    const slotTime = state.runAt
    const attemptsLeft = state.kind === 'in-chain' ? state.attemptsLeft : MAX_CHAIN_ATTEMPTS

    try {
      await scrapeFuelPrices()
    } catch (err) {
      logger.error({ err }, '[worker] Scheduled scrape failed')
    }

    if (await isTodayInDb()) {
      logger.info('[worker] Scrape succeeded')
      scheduleNextChain()
      return
    }

    const newAttemptsLeft = attemptsLeft - 1
    if (newAttemptsLeft <= 0) {
      logger.info('[worker] Chain exhausted — rolling over to next weekday')
      scheduleNextChain()
      return
    }

    const nextSlotTime = slotTime + RETRY_INTERVAL_MS
    logger.info(`[worker] Stale — next attempt at ${fmtLT(new Date(nextSlotTime))} (${newAttemptsLeft} left)`)
    state = { kind: 'in-chain', runAt: nextSlotTime, attemptsLeft: newAttemptsLeft }
  } finally {
    scraping = false
  }
}

updateCoordinatesFromCatalog()
  .catch((err: unknown) => logger.error({ err }, 'Startup coordinate sync failed'))

bootstrap()
  .catch((err: unknown) => {
    logger.error({ err }, '[worker] Bootstrap failed')
    scheduleNextChain()
  })
  .finally(() => {
    schedule('* * * * *', tick)
  })
