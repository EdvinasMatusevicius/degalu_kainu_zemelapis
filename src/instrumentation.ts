export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { migrate } = await import('drizzle-orm/node-postgres/migrator')
    const { db } = await import('./lib/db')
    await migrate(db, { migrationsFolder: './drizzle' })

    try {
      const { updateCoordinatesFromCatalog } = await import('../jobs/coordinates')
      await updateCoordinatesFromCatalog()
    } catch (err) {
      console.error('[coordinates] Startup coordinate update failed:', err)
    }
  }
}
