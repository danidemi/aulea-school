ID: DB-MIGRATIONS-001

As:
a `maintainer` of aulea-platform

I want to:
use a well established database migration tool to version and apply database schema changes,
with migration files stored in the app's own repository

So that:
schema changes are tracked, repeatable, and applied the same way in every environment

Definition of Done:
* migration tool matches the ORM chosen in ORM-SELECTION-001, files under version control in
  `server/`, applied via a single documented command
* a first migration produces the `tenants`/`users` schema TENANT-001 needs
* the migration command is idempotent (re-running is a no-op)

Implemented (sprint, 2026-08-21):
* `drizzle-kit` (`generate`/`migrate`, not `push` — ADR-0003); `server/scripts/db-migrate.ts`
  applies `drizzle/*.sql` via `npm run db:migrate` (`npm run db:generate` to create one)
* first migration `server/drizzle/0000_loving_chamber.sql`: `tenants` (id, name unique,
  created_at), `users` (id, email unique, current_tenant_id → tenants.id nullable, created_at)
* migrations also run automatically on server startup (`server/src/index.ts`) — DB unreachable
  makes the server exit 1 instead of starting unmigrated
* verified idempotent against a clean Postgres (two `npm run db:migrate` runs, checked via
  `\dt`/tracking table directly); `npm test`/`npm run build` green
