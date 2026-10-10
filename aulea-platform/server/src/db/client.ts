import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema.js'

/**
 * The shared Drizzle client for `server/`. Reads DATABASE_URL, which points
 * at the Postgres instance started by `docker-compose.yml` (see
 * `.env.example`). Not imported by anything that runs in `npm test` — the
 * unit test suite must stay DB-free (repositories built on this are always
 * behind an interface a test can fake, e.g. `UserRepository`,
 * `TenantRepository`).
 */
export function createDb(databaseUrl: string) {
  const pool = new Pool({ connectionString: databaseUrl })
  return { db: drizzle(pool, { schema }), pool }
}
