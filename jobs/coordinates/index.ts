import { eq, isNull } from 'drizzle-orm'
import { db } from '../../src/lib/db'
import { stations, osmStations } from '../../src/lib/schema'

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter'
const QUERY = `
[out:json][timeout:60];
area["ISO3166-1"="LT"]->.lt;
nwr["amenity"="fuel"](area.lt);
out center tags;
`

interface OsmElement {
  type: 'node' | 'way' | 'relation'
  id: number
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  tags: Record<string, string>
}

type OsmStation = typeof osmStations.$inferSelect

export async function refreshOsmData(): Promise<void> {
  const res = await fetch(OVERPASS_URL, {
    method: 'POST',
    body: `data=${encodeURIComponent(QUERY.trim())}`,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
      'User-Agent': 'degalu-zemelapis/1.0',
    },
  })
  if (!res.ok) throw new Error(`Overpass API failed: ${res.status}`)

  const data: { elements: OsmElement[] } = await res.json()

  const values = data.elements
    .map((el) => {
      const lat = el.lat ?? el.center?.lat
      const lon = el.lon ?? el.center?.lon
      if (lat == null || lon == null) return null
      return {
        osmId: el.id,
        osmType: el.type,
        lat: lat.toString(),
        lon: lon.toString(),
        name: el.tags.name ?? null,
        brand: el.tags.brand ?? null,
        operator: el.tags.operator ?? null,
        addrStreet: el.tags['addr:street'] ?? null,
        addrHousenumber: el.tags['addr:housenumber'] ?? null,
        addrCity: el.tags['addr:city'] ?? el.tags['addr:place'] ?? null,
      }
    })
    .filter((v): v is NonNullable<typeof v> => v !== null)

  await db.delete(osmStations)
  for (let i = 0; i < values.length; i += 500) {
    await db.insert(osmStations).values(values.slice(i, i + 500))
  }

}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/ą/g, 'a').replace(/č/g, 'c').replace(/ę/g, 'e').replace(/ė/g, 'e')
    .replace(/į/g, 'i').replace(/š/g, 's').replace(/ų/g, 'u').replace(/ū/g, 'u')
    .replace(/ž/g, 'z')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// "S.Savicko įmonė (Circle K)" → "circle k", "Neste Lietuva" → "neste"
function normalizeBrand(brand: string): string {
  const parenMatch = brand.match(/\(([^)]+)\)/)
  if (parenMatch) return normalize(parenMatch[1])
  return normalize(brand.replace(/\s+(Lietuva|UAB|MB|IĮ|ŽŪB|nafta)$/i, ''))
}

// Handles two formats from ena.lt:
//   "Kalvarijų g. 204G, Vilnius"  → street first, city after comma
//   "Alytus, Naujoji g. 27"       → city first (no digits), street after comma
function extractStreetParts(address: string): { city: string | null; housenumber: string | null } {
  const commaIdx = address.indexOf(',')
  if (commaIdx < 0) {
    const numMatch = address.match(/(\d+[a-zA-Z]?)(?:[/\\-]\d+[a-zA-Z]?)?\s*$/)
    return { city: null, housenumber: numMatch ? numMatch[1].toLowerCase() : null }
  }

  const before = address.slice(0, commaIdx).trim()
  const after = address.slice(commaIdx + 1).trim()

  const cityFirst = !/\d/.test(before)
  const streetPart = cityFirst ? after : before
  const city = cityFirst ? before : after

  const numMatch = streetPart.match(/(\d+[a-zA-Z]?)(?:[/\\-]\d+[a-zA-Z]?)?\s*$/)
  return {
    city,
    housenumber: numMatch ? numMatch[1].toLowerCase() : null,
  }
}

function matchStation(
  brand: string,
  address: string,
  osmList: OsmStation[],
): OsmStation | null {
  const normBrand = normalizeBrand(brand)
  const { city, housenumber } = extractStreetParts(address)
  const normCity = city ? normalize(city) : null

  let candidates = osmList.filter((osm) => {
    const osmBrand = normalizeBrand(osm.brand ?? osm.operator ?? osm.name ?? '')
    return osmBrand === normBrand
  })

  if (candidates.length === 0) return null

  // Narrow by city — skip for village/settlement addresses (end with k., g., mstl. etc.)
  const isVillage = city ? /\b(k\.|mstl\.|vs\.)$/.test(city.trim()) : false
  if (normCity && !isVillage) {
    const cityFiltered = candidates.filter((osm) => osm.addrCity && normalize(osm.addrCity) === normCity)
    if (cityFiltered.length > 0) candidates = cityFiltered
  }

  if (candidates.length === 1) return candidates[0]
  if (!housenumber) return null

  // Exact match first
  const exact = candidates.find((osm) => osm.addrHousenumber?.toLowerCase() === housenumber)
  if (exact) return exact

  // Fallback: strip trailing letter ("37A" → "37") to handle OSM/ena.lt discrepancies
  const numOnly = housenumber.replace(/[a-z]+$/, '')
  return candidates.find((osm) => osm.addrHousenumber?.toLowerCase().replace(/[a-z]+$/, '') === numOnly) ?? null
}

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'

function formatForNominatim(address: string): string {
  const commaIdx = address.indexOf(',')
  if (commaIdx < 0) return `${address}, Lithuania`
  const before = address.slice(0, commaIdx).trim()
  const after = address.slice(commaIdx + 1).trim()
  // city-first: "Vilnius, Molėtų pl. 27A" → "Molėtų pl. 27A, Vilnius, Lithuania"
  if (!/\d/.test(before)) return `${after}, ${before}, Lithuania`
  return `${address}, Lithuania`
}

async function geocodeAddress(address: string): Promise<{ lat: string; lon: string } | null> {
  const query = formatForNominatim(address)
  const url = `${NOMINATIM_URL}?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=lt`
  const res = await fetch(url, { headers: { 'User-Agent': 'degalu-zemelapis/1.0' } })
  if (!res.ok) throw new Error(`Nominatim failed: ${res.status}`)
  const data = await res.json() as { lat: string; lon: string }[]
  return data.length > 0 ? { lat: data[0].lat, lon: data[0].lon } : null
}

export async function geocodeMissingWithNominatim(): Promise<void> {
  const unmatched = await db.select().from(stations).where(isNull(stations.lat))
  if (unmatched.length === 0) return

  console.log(`[coordinates] Geocoding ${unmatched.length} stations via Nominatim`)

  let matched = 0
  for (const station of unmatched) {
    try {
      const coords = await geocodeAddress(station.address)
      if (coords) {
        await db.update(stations).set(coords).where(eq(stations.id, station.id))
        matched++
      }
    } catch (err) {
      console.error(`[coordinates] Nominatim error for "${station.address}":`, err)
    }
    // Nominatim usage policy: max 1 request/second
    await new Promise((r) => setTimeout(r, 1100))
  }

  console.log(`[coordinates] Nominatim done — matched ${matched}/${unmatched.length} stations`)
}

export async function updateMissingCoordinates({ allowRefresh = false } = {}): Promise<void> {
  let osmList = await db.select().from(osmStations)

  if (osmList.length === 0) {
    await refreshOsmData()
    osmList = await db.select().from(osmStations)
  }

  const unmatched = await db.select().from(stations).where(isNull(stations.lat))
  if (unmatched.length === 0) return

  console.log(`[coordinates] Updating coordinates for ${unmatched.length} stations`)

  const stillUnmatched: typeof unmatched = []
  for (const station of unmatched) {
    const match = matchStation(station.brand, station.address, osmList)
    if (match) {
      await db.update(stations).set({ lat: match.lat, lon: match.lon }).where(eq(stations.id, station.id))
    } else {
      stillUnmatched.push(station)
    }
  }

  if (stillUnmatched.length > 0 && allowRefresh) {
    await refreshOsmData()
    osmList = await db.select().from(osmStations)

    for (const station of stillUnmatched) {
      const match = matchStation(station.brand, station.address, osmList)
      if (match) {
        await db.update(stations).set({ lat: match.lat, lon: match.lon }).where(eq(stations.id, station.id))
        stillUnmatched.splice(stillUnmatched.indexOf(station), 1)
      }
    }
  }

  const matched = unmatched.length - stillUnmatched.length
  console.log(`[coordinates] Done — matched ${matched}/${unmatched.length} stations`)
}
