export const dynamic = 'force-dynamic'

import { db } from '@/lib/db'
import { fuelPrices, stations } from '@/lib/schema'
import { eq, desc } from 'drizzle-orm'

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
  const { date, rows } = await getLatestPrices()

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-1">Degalų kainos</h1>
      {date ? (
        <p className="text-gray-500 mb-6">Data: {date}</p>
      ) : (
        <p className="text-gray-500 mb-6">Nėra duomenų</p>
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
