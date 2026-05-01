import { pgTable, serial, varchar, numeric, date, timestamp, integer, unique, index } from 'drizzle-orm/pg-core'

export const stations = pgTable('stations', {
  id: serial('id').primaryKey(),
  brand: varchar('brand').notNull(),
  municipality: varchar('municipality').notNull(),
  address: varchar('address').notNull(),
}, (t) => [
  unique().on(t.brand, t.address),
])

export const fuelPrices = pgTable('fuel_prices', {
  id: serial('id').primaryKey(),
  priceDate: date('price_date').notNull(),
  stationId: integer('station_id').notNull().references(() => stations.id),
  price95: numeric('price_95', { precision: 6, scale: 3 }),
  priceDiesel: numeric('price_diesel', { precision: 6, scale: 3 }),
  priceLpg: numeric('price_lpg', { precision: 6, scale: 3 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  unique().on(t.priceDate, t.stationId),
  index().on(t.priceDate),
])
