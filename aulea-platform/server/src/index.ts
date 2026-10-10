import 'dotenv/config'
import { createApp } from './app.js'
import { applyMigrations } from './db/migrate.js'

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000

/**
 * Applies pending Drizzle migrations before accepting requests — the same
 * role Flyway plays on Quarkus startup. Requires DATABASE_URL; the app
 * intentionally fails to start rather than serve against a stale/missing
 * schema.
 */
async function main() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not set — copy server/.env.example to server/.env first')
  }

  await applyMigrations(databaseUrl)

  createApp().listen(PORT, () => {
    console.log(`aulea-platform server listening on port ${PORT}`)
  })
}

main().catch((err) => {
  console.error('server failed to start:', err)
  process.exitCode = 1
})
