export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { migrate } = await import('drizzle-orm/node-postgres/migrator')
    const { db } = await import('./lib/db')
    await migrate(db, { migrationsFolder: './drizzle' })

    // Coordinate enrichment disabled — catalog matching is considered complete.
    // Re-enable if the station catalog is refreshed.
    // try {
    //   const { updateCoordinatesFromCatalog } = await import('../jobs/coordinates')
    //   await updateCoordinatesFromCatalog()
    // } catch (err) {
    //   console.error('[coordinates] Startup coordinate update failed:', err)
    // }
  }
}
