import { PostgreSqlContainer } from '@testcontainers/postgresql'
import { applyMigrations } from '../db/migrate.js'
import { createDb } from '../db/client.js'

/**
 * TEST-INTEGRATION-001 / ADR-0014: an ephemeral Postgres for repository
 * integration tests. Same major version as `docker-compose.yml`; the schema is
 * built by the production `applyMigrations`, which reads `./drizzle`, so the
 * integration run must start from `server/` (the `test:integration` script does).
 */
export async function startPostgres() {
  const container = await new PostgreSqlContainer('postgres:16-alpine').start()
  const url = container.getConnectionUri()
  await applyMigrations(url)
  const { db, pool } = createDb(url)
  return {
    url,
    db,
    pool,
    async stop() {
      await pool.end()
      await container.stop()
    },
  }
}

export type TestPostgres = Awaited<ReturnType<typeof startPostgres>>
