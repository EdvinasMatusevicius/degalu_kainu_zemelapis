import { readFileSync } from 'fs'
import { join } from 'path'
import { eq } from 'drizzle-orm'
import { db } from '../../src/lib/db'
import { stations } from '../../src/lib/schema'

interface CatalogEntry {
  company: string
  municipality: string
  address: string
  lat: number
  lng: number
}

interface CatalogJson {
  stations: CatalogEntry[]
}

// Match key tolerant of the formatting drift between the ena.lt price feed and the
// catalog: case, punctuation, whitespace, and the trailing 5-digit postal code the
// feed appends (e.g. ", 50313") but the catalog usually omits. This normalization is
// comparison-only — it is never written back, so the stored address (the price join
// key) is untouched. Verified to produce no catalog-internal key collisions.
function stationKey(brand: string, address: string): string {
  const norm = (s: string) =>
    s.replace(/,?\s*(LT-?)?\d{5}\b\s*$/i, '') // drop trailing postal code
      .toLowerCase()
      .replace(/[^0-9a-ząčęėįšųūž]/gi, '') // drop punctuation & whitespace
  return `${norm(brand)}|||${norm(address)}`
}

function loadCatalog(): Map<string, CatalogEntry> {
  const filePath = join(process.cwd(), 'data', 'station_catalog.json')
  const raw: CatalogJson = JSON.parse(readFileSync(filePath, 'utf8'))
  const map = new Map<string, CatalogEntry>()
  for (const entry of raw.stations) {
    if (entry.lat != null && entry.lng != null) {
      map.set(stationKey(entry.company, entry.address), entry)
    }
  }
  return map
}

// Updates coordinates for ALL stations that exist in the catalog — fixes both missing
// and previously wrong coordinates in one pass.
export async function updateCoordinatesFromCatalog(): Promise<void> {
  const catalog = loadCatalog()
  const allStations = await db.select().from(stations)
  if (allStations.length === 0) return

  let matched = 0
  for (const station of allStations) {
    const entry = catalog.get(stationKey(station.brand, station.address))
    if (entry) {
      await db.update(stations)
        .set({ lat: entry.lat.toString(), lon: entry.lng.toString() })
        .where(eq(stations.id, station.id))
      matched++
    }
  }

  const unmatched = allStations.length - matched
  console.log(`[coordinates] Done — matched ${matched}/${allStations.length} stations (${unmatched} still without coordinates)`)
}

// TODO: implement a scraper that downloads all LT addresses + coordinates from
// https://www.registrucentras.lt/aduomenys/?byla=adr_gra_adresai_LT.zip
// and geocodes stations that still have no coordinates after catalog sync.
