import { parse } from 'node-html-parser'
import * as XLSX from 'xlsx'
import { and, eq } from 'drizzle-orm'
import { db } from '../../src/lib/db'
import { stations, fuelPrices } from '../../src/lib/schema'
import { updateCoordinatesFromCatalog } from '../coordinates'
import { logger } from '../logger'

export async function scrapeFuelPrices(): Promise<void> {
  logger.info('[scraper] Started')

  const sharePointUrl = await extractSharePointUrl()
  const fileGetUrl = await extractFileGetUrl(sharePointUrl)
  const data = await downloadAndParseXlsx(fileGetUrl)
  await saveToDb(data)

  logger.info('[scraper] Done')
}

async function saveToDb(data: Record<string, unknown[][]>): Promise<void> {
  const rows = data['Degalų kainos'] ?? []
  const dataRows = rows.filter((row) => typeof row[0] === 'number')

  const priceDate = excelSerialToDate(dataRows[0][0] as number)

  const existing = await db.select({ id: fuelPrices.id }).from(fuelPrices).where(eq(fuelPrices.priceDate, priceDate)).limit(1)
  if (existing.length > 0) {
    logger.info(`[scraper] Data for ${priceDate} already in DB, skipping`)
    return
  }

  for (const row of dataRows) {
    const rowDate = excelSerialToDate(row[0] as number)
    const brand = row[1] as string
    const municipality = row[2] as string
    const address = row[3] as string

    await db
      .insert(stations)
      .values({ brand, municipality, address })
      .onConflictDoNothing()

    const [station] = await db
      .select({ id: stations.id })
      .from(stations)
      .where(and(eq(stations.brand, brand), eq(stations.address, address)))

    await db
      .insert(fuelPrices)
      .values({
        priceDate: rowDate,
        stationId: station.id,
        price95: toPrice(row[4]),
        priceDiesel: toPrice(row[5]),
        priceLpg: toPrice(row[6]),
      })
      .onConflictDoNothing()
  }

  // Coordinate pipeline runs in background — doesn't block scheduling
  updateCoordinatesFromCatalog()
    .catch((err: unknown) => logger.error({ err }, '[scraper] Post-insert coordinate update failed'))
}

function excelSerialToDate(serial: number): string {
  return new Date((serial - 25569) * 86400 * 1000).toISOString().split('T')[0]
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
