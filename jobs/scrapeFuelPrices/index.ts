import { parse } from 'node-html-parser'
import * as XLSX from 'xlsx'
import { and, eq } from 'drizzle-orm'
import { db } from '../../src/lib/db'
import { stations, fuelPrices } from '../../src/lib/schema'
// Coordinate enrichment is disabled — the station catalog has been matched as far as it
// usefully can. Kept (commented) so it can be re-enabled later if needed.
// import { updateCoordinatesFromCatalog } from '../coordinates'
import { logger } from '../logger'

export async function scrapeFuelPrices(): Promise<void> {
  logger.info('[scraper] Started')

  const sharePointUrl = await extractSharePointUrl()
  const fileGetUrl = await extractFileGetUrl(sharePointUrl)
  const data = await downloadAndParseXlsx(fileGetUrl)
  await saveToDb(data)

  logger.info('[scraper] Done')
}

// ena.lt sheet layout (changed 2026-06-12 to a tidy/long format with a preamble):
//   [0] legal name  [1] municipality  [2] address  [3] fuel type  [4] price  [5] date ("YYYY-MM-DD")
// One row per station × fuel type, so rows are pivoted back into one record per station.
const COL = { brand: 0, municipality: 1, address: 2, fuelType: 3, price: 4, date: 5 } as const
const FUEL_TYPE_FIELD = { '95 benzinas': 'price95', Dyzelinas: 'priceDiesel', SND: 'priceLpg' } as const

interface StationRecord {
  legalName: string
  municipality: string
  address: string
  price95: string | null
  priceDiesel: string | null
  priceLpg: string | null
}

type ExistingStation = { id: number; brand: string; legalName: string | null; address: string }

async function saveToDb(data: Record<string, unknown[][]>): Promise<void> {
  const rows = data['Degalų kainos'] ?? []
  // Real data rows have a numeric price and a string date — this skips the preamble + header.
  const dataRows = rows.filter(
    (row) => typeof row[COL.price] === 'number' && typeof row[COL.date] === 'string',
  )
  if (dataRows.length === 0) {
    throw new Error('[scraper] No data rows in "Degalų kainos" sheet — ena.lt format may have changed')
  }

  const priceDate = mostCommonDate(dataRows)
  const strayCount = dataRows.filter((r) => r[COL.date] !== priceDate).length
  if (strayCount > 0) {
    logger.warn(`[scraper] Dropping ${strayCount} row(s) whose date != canonical ${priceDate}`)
  }

  const existing = await db.select({ id: fuelPrices.id }).from(fuelPrices).where(eq(fuelPrices.priceDate, priceDate)).limit(1)
  if (existing.length > 0) {
    logger.info(`[scraper] Data for ${priceDate} already in DB, skipping`)
    return
  }

  // Pivot the per-fuel-type rows into one record per station.
  const byStation = new Map<string, StationRecord>()
  for (const row of dataRows) {
    if (row[COL.date] !== priceDate) continue
    const legalName = row[COL.brand] as string
    const address = row[COL.address] as string
    const key = `${legalName}|||${address}`

    let rec = byStation.get(key)
    if (!rec) {
      rec = { legalName, municipality: row[COL.municipality] as string, address, price95: null, priceDiesel: null, priceLpg: null }
      byStation.set(key, rec)
    }

    const field = FUEL_TYPE_FIELD[row[COL.fuelType] as keyof typeof FUEL_TYPE_FIELD]
    if (field) rec[field] = toPrice(row[COL.price])
  }

  // Reconnect feed rows to existing stations by NORMALIZED ADDRESS, so the same
  // station.id is reused (favorites + history preserved) despite ena.lt switching
  // brands -> legal names and reformatting addresses. See station-match/ for how this
  // strategy was validated (~92% of feed rows match an existing station).
  const existingStations: ExistingStation[] = await db
    .select({ id: stations.id, brand: stations.brand, legalName: stations.legalName, address: stations.address })
    .from(stations)
    .orderBy(stations.id)
  const index = new Map<string, ExistingStation[]>()
  for (const st of existingStations) {
    const k = normalizeAddress(st.address)
    if (!k) continue
    const bucket = index.get(k)
    if (bucket) bucket.push(st)
    else index.set(k, [st])
  }

  let matched = 0
  let created = 0
  for (const rec of byStation.values()) {
    const bucket = index.get(normalizeAddress(rec.address))
    const candidates = bucket ?? []
    // Tiebreak address collisions by legal-name match; otherwise take the lowest id.
    const hit = candidates.find((c) => c.legalName === rec.legalName) ?? candidates[0]

    let stationId: number
    if (hit && bucket) {
      stationId = hit.id
      matched++
      // Consume the row so a second feed station at the same normalized address (e.g. a
      // co-located car wash) becomes its own station instead of colliding on
      // unique(price_date, station_id) and getting silently dropped.
      bucket.splice(bucket.indexOf(hit), 1)
      if (hit.legalName !== rec.legalName) {
        await db.update(stations).set({ legalName: rec.legalName }).where(eq(stations.id, hit.id))
        hit.legalName = rec.legalName
      }
    } else {
      const brand = displayName(rec.legalName)
      const address = cleanAddress(rec.address)
      await db
        .insert(stations)
        .values({ brand, legalName: rec.legalName, municipality: rec.municipality, address })
        .onConflictDoNothing()
      const [row] = await db
        .select({ id: stations.id })
        .from(stations)
        .where(and(eq(stations.brand, brand), eq(stations.address, address)))
      stationId = row.id
      created++
    }

    await db
      .insert(fuelPrices)
      .values({ priceDate, stationId, price95: rec.price95, priceDiesel: rec.priceDiesel, priceLpg: rec.priceLpg })
      .onConflictDoNothing()
  }

  logger.info(`[scraper] ${priceDate}: ${byStation.size} stations (${matched} matched existing, ${created} new)`)

  // Coordinate pipeline disabled — see import note above. Re-enable if the catalog is refreshed.
  // updateCoordinatesFromCatalog()
  //   .catch((err: unknown) => logger.error({ err }, '[scraper] Post-insert coordinate update failed'))
}

// exp7 address matcher (validated in station-match/): fold diacritics, drop postal codes
// and "(district)" notes, glue "148 B" -> "148B", canonicalize Lithuanian street-type
// words, then split into words and sort. The result is order- and format-independent, so
// "Ukmergės g. 319, Vilnius" and "Vilnius, Ukmergės g. 319, 06305" produce the same key.
const STREET_WORD = new Map<string, string>([
  ['g', 'gatve'], ['gatve', 'gatve'], ['gatves', 'gatve'],
  ['pr', 'prospektas'], ['prospektas', 'prospektas'],
  ['pl', 'plentas'], ['plentas', 'plentas'],
  ['kel', 'kelias'], ['kl', 'kelias'], ['kelias', 'kelias'], ['kelio', 'kelias'],
  ['al', 'aleja'], ['aleja', 'aleja'],
  ['kaimas', 'k'], ['kaimo', 'k'], ['km', 'k'],
  ['viensedis', 'vs'],
  ['apylinke', 'apyl'],
])

function normalizeAddress(address: string): string {
  return address
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // strip diacritics -> ascii
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')             // drop "(Pilaitė)" district notes
    .replace(/,?\s*(lt-?)?\d{5}\b/gi, ' ')  // drop postal codes anywhere
    .replace(/(\d)\s+([a-z])\b/g, '$1$2')   // glue "148 b" -> "148b"
    .split(/[^0-9a-z]+/i)
    .filter(Boolean)
    .map((t) => STREET_WORD.get(t) ?? t)
    .sort()
    .join('|')
}

// Derive a clean display brand for a brand-new station by stripping the legal-form prefix
// (e.g. "AB Orlen Baltics Retail" -> "Orlen Baltics Retail"). Existing matched stations
// keep their already-clean brand; this only affects rows with no DB counterpart.
function displayName(legalName: string): string {
  return legalName.replace(/^\s*(UAB|AB|IĮ|MB|ŽŪB|VšĮ|KB)\s+/i, '').trim() || legalName
}

// Display address for a brand-new station: drop the trailing postal code the feed appends
// (e.g. "Vilnius, Ukmergės g. 319, 06305" -> "Vilnius, Ukmergės g. 319"). Matched stations
// keep their existing (already postal-free) address untouched.
function cleanAddress(address: string): string {
  return address.replace(/,?\s*(LT-?)?\d{5}\b\s*$/i, '').trim()
}

function mostCommonDate(dataRows: unknown[][]): string {
  const counts = new Map<string, number>()
  for (const row of dataRows) {
    const d = row[COL.date] as string
    counts.set(d, (counts.get(d) ?? 0) + 1)
  }
  let bestDate = ''
  let bestCount = -1
  for (const [d, c] of counts) {
    if (c > bestCount) {
      bestDate = d
      bestCount = c
    }
  }
  return bestDate
}

function toPrice(value: unknown): string | null {
  return typeof value === 'number' ? value.toString() : null
}

async function extractSharePointUrl(): Promise<string> {
  const res = await fetch('https://www.ena.lt/degalu-kainos-degalinese/')
  if (!res.ok) throw new Error(`ena.lt fetch failed: ${res.status}`)

  const root = parse(await res.text())
  const link = root.querySelectorAll('a').find((a) => a.text.includes('Naujausios'))
  if (!link) throw new Error('Fuel prices link not found on ena.lt')

  const href = link.getAttribute('href')
  if (!href) throw new Error('Link has no href')
  return href
}

async function extractFileGetUrl(sharePointUrl: string): Promise<string> {
  const redirectRes = await fetch(sharePointUrl, { redirect: 'manual' })
  const redirectCookies = extractCookies(redirectRes.headers)
  const viewerPageUrl = redirectRes.headers.get('location')
  if (!viewerPageUrl) throw new Error('No redirect location from SharePoint')

  const viewerPageRes = await fetch(viewerPageUrl, { headers: { Cookie: redirectCookies } })
  if (!viewerPageRes.ok) throw new Error(`SharePoint page fetch failed: ${viewerPageRes.status}`)

  const viewerPageHtml = await viewerPageRes.text()
  const fileGetUrlMatch = viewerPageHtml.match(/"FileGetUrl":"((?:[^"\\]|\\.)*)"/)
  if (!fileGetUrlMatch) throw new Error('FileGetUrl not found in SharePoint page')

  return JSON.parse(`"${fileGetUrlMatch[1]}"`)
}

function extractCookies(headers: Headers): string {
  return (headers as unknown as { getSetCookie?(): string[] })
    .getSetCookie?.()
    ?.map((c) => c.split(';')[0])
    .join('; ') ?? ''
}

async function downloadAndParseXlsx(url: string): Promise<Record<string, unknown[][]>> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`xlsx download failed: ${res.status}`)

  const buffer = Buffer.from(await res.arrayBuffer())
  const workbook = XLSX.read(buffer, { type: 'buffer' })

  const result: Record<string, unknown[][]> = {}
  for (const sheetName of workbook.SheetNames) {
    result[sheetName] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 })
  }
  return result
}
