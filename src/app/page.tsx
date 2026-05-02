export const dynamic = 'force-dynamic'

import { db } from '@/lib/db'
import { fuelPrices, stations } from '@/lib/schema'
import { eq, desc, isNotNull, and } from 'drizzle-orm'
import StationsMap from './components/StationsMap'

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
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-1">Degalų kainos</h1>
      {date ? (
        <p className="text-gray-500 mb-6">Data: {date}</p>
      ) : (
        <p className="text-gray-500 mb-6">Nėra duomenų</p>
      )}

      {mapStations.length > 0 && (
        <div className="mb-8">
          <StationsMap stations={mapStations} />
          <p className="text-xs text-gray-400 mt-1">{mapStations.length} stotys su koordinatėmis</p>
        </div>
      )}

      {rows.length > 0 && (
        <div className="overflow-x-auto">
          <table className="border-collapse text-sm">
            <thead>
              <tr className="">
                <th className="border border-gray-300 px-3 py-2 text-left">Tinklas</th>
                <th className="border border-gray-300 px-3 py-2 text-left">Savivaldybė</th>
                <th className="border border-gray-300 px-3 py-2 text-left">Adresas</th>
                <th className="border border-gray-300 px-3 py-2 text-right">A95</th>
                <th className="border border-gray-300 px-3 py-2 text-right">Dyzelinas</th>
                <th className="border border-gray-300 px-3 py-2 text-right">LPG</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i}>
                  <td className="border border-gray-300 px-3 py-2">{row.brand}</td>
                  <td className="border border-gray-300 px-3 py-2">{row.municipality}</td>
                  <td className="border border-gray-300 px-3 py-2">{row.address}</td>
                  <td className="border border-gray-300 px-3 py-2 text-right">{row.price95 ?? '—'}</td>
                  <td className="border border-gray-300 px-3 py-2 text-right">{row.priceDiesel ?? '—'}</td>
                  <td className="border border-gray-300 px-3 py-2 text-right">{row.priceLpg ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
