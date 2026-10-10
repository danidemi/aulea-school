import 'dotenv/config'
import { defineConfig } from 'drizzle-kit'

// DB-MIGRATIONS-001 uses this config for `drizzle-kit generate` / `migrate`.
// ORM-SELECTION-001's spike table lives in src/db/schema.ts so `generate`
// has something to produce a migration from during the spike.
export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgres://aulea_platform:aulea_platform@localhost:5432/aulea_platform',
  },
})
