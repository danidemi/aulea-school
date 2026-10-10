import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { createDb } from './client.js'

/**
 * Applies every migration file under `drizzle/` against `databaseUrl`,
 * tracked in Postgres by drizzle's own `__drizzle_migrations` table — so
 * calling this twice in a row is a no-op the second time.
 *
 * Used both by the standalone `npm run db:migrate` (scripts/db-migrate.ts)
 * and by `index.ts` on server startup, Flyway-in-Quarkus style, so the
 * schema is always current before the app accepts requests.
 */
export async function applyMigrations(databaseUrl: string): Promise<void> {
  const { db, pool } = createDb(databaseUrl)
  try {
    await migrate(db, { migrationsFolder: './drizzle' })
  } finally {
    await pool.end()
  }
}
