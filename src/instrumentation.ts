export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { migrate } = await import('drizzle-orm/node-postgres/migrator')
    const { db } = await import('./lib/db')
    await migrate(db, { migrationsFolder: './drizzle' })

    try {
      const { updateMissingCoordinates } = await import('../jobs/coordinates')
      await updateMissingCoordinates()
    } catch (err) {
      console.error('[coordinates] Startup coordinate update failed:', err)
    }
  }
}
