import 'dotenv/config'
import { applyMigrations } from '../src/db/migrate.js'

/**
 * DB-MIGRATIONS-001: standalone CLI wrapper around applyMigrations, for
 * running migrations by hand (e.g. against a remote environment) without
 * starting the server. `index.ts` calls applyMigrations directly on
 * startup — see that file's comment.
 *
 * Run with: npm run db:migrate
 */
async function main() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not set — copy server/.env.example to server/.env first')
  }

  await applyMigrations(databaseUrl)
  console.log('migrations applied')
}

main().catch((err) => {
  console.error('db migrate failed:', err)
  process.exitCode = 1
})
