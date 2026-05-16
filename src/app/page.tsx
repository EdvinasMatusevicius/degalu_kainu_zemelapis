export const dynamic = 'force-dynamic'

import { db } from '@/lib/db'
import { fuelPrices, stations } from '@/lib/schema'
import { eq, desc, isNotNull, and } from 'drizzle-orm'
import StationsView from './components/StationsView'

async function getStationsWithCoords() {
  const latest = await db
    .select({ priceDate: fuelPrices.priceDate })
    .from(fuelPrices)
    .orderBy(desc(fuelPrices.priceDate))
    .limit(1)

  const latestDate = latest[0]?.priceDate ?? null

  const rows = await db
    .select({
      id: stations.id,
      brand: stations.brand,
      address: stations.address,
      municipality: stations.municipality,
      lat: stations.lat,
      lon: stations.lon,
      price95: fuelPrices.price95,
      priceDiesel: fuelPrices.priceDiesel,
      priceLpg: fuelPrices.priceLpg,
    })
    .from(stations)
    .leftJoin(
      fuelPrices,
      and(
        eq(fuelPrices.stationId, stations.id),
        latestDate ? eq(fuelPrices.priceDate, latestDate) : undefined,
      ),
    )
    .where(isNotNull(stations.lat))

  return rows.map((r) => ({
    ...r,
    lat: parseFloat(r.lat!),
    lon: parseFloat(r.lon!),
  }))
}

async function getLatestPrices() {
  const latestDate = await db
    .select({ priceDate: fuelPrices.priceDate })
    .from(fuelPrices)
    .orderBy(desc(fuelPrices.priceDate))
    .limit(1)

  if (latestDate.length === 0) return { date: null, rows: [] }

  const date = latestDate[0].priceDate

  const rows = await db
    .select({
      id: stations.id,
      brand: stations.brand,
      municipality: stations.municipality,
      address: stations.address,
      price95: fuelPrices.price95,
      priceDiesel: fuelPrices.priceDiesel,
      priceLpg: fuelPrices.priceLpg,
    })
    .from(fuelPrices)
    .innerJoin(stations, eq(fuelPrices.stationId, stations.id))
    .where(eq(fuelPrices.priceDate, date))
    .orderBy(stations.brand, stations.municipality)

  return { date, rows }
}

export default async function Home() {
  const [{ date, rows }, mapStations] = await Promise.all([
    getLatestPrices(),
    getStationsWithCoords(),
  ])

  return (
    <div className="p-2 h-screen flex flex-col">
      <div className='mb-5'>
        <span className="text-2xl font-bold mb-1">Degalų kainos</span>
        {date ? (
          <span className="text-foreground/60 mx-4">Data: {date}</span>
        ) : (
          <span className="text-foreground/60 mx-4">Nėra duomenų</span>
        )}
      </div>

      {/* flex-1 min-h-0: takes all remaining vertical space; min-h-0 lets it shrink below content size */}
      <div className="flex-1 min-h-0">
        <StationsView mapStations={mapStations} rows={rows} />
      </div>
    </div>
  )
}
