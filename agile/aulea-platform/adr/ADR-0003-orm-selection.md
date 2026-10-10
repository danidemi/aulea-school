# ADR-0003: ORM/query-builder for PostgreSQL access

## Status
Accepted — 2026-08-21

## Context
ADR-0002 decided PostgreSQL as the persistence layer but deferred the specific TypeScript
ORM/query-builder to "whichever story first needs to read/write the database", naming Prisma
and Drizzle as candidates. `ORM-SELECTION-001` gives that decision an owner, ahead of
TENANT-001 and DB-MIGRATIONS-001, both of which depend on it.

`server/` is Express + TypeScript, `"type": "module"`, compiled with `moduleResolution:
NodeNext` (per `adr/ADR-0001-tech-stack.md`).

## Decision
Use **Drizzle** (`drizzle-orm` + `drizzle-kit`) with the `pg` driver (`drizzle-orm/node-postgres`),
over Prisma.

* Drizzle's schema is plain TypeScript (`src/db/schema.ts`), no separate DSL file and no code
  generation step to run before types are available — this matches ADR-0001's TypeScript-first
  rationale more directly than Prisma's `schema.prisma` + generated client, and fits
  `server/`'s existing `NodeNext` ESM setup without extra loader configuration.
* Prisma requires its own query engine binary and a generate step wired into the build; Drizzle
  is a thin layer over the `pg` driver, so there's one less moving part in `server/`'s build and
  deploy path.
* `pg` is the driver named in ADR-0002 ("mature TypeScript/Node drivers ... e.g. Prisma or
  Drizzle") and is Node ≥16, compatible with the project's Node 18 runtime.
* `drizzle-kit` ships both `generate` (SQL migration files) and `migrate` (an applied-migrations
  tracking table) commands, which DB-MIGRATIONS-001 uses — see that story's Definition of Done
  ("migration files live under version control" and "running the migration command twice is a
  no-op"). `drizzle-kit push` (schema-diff-and-apply, no migration files) was ruled out for that
  reason; it is used only for materializing this story's own throwaway spike table.

## Addendum — 2026-08-21
`server/src/index.ts` calls `applyMigrations()` (`server/src/db/migrate.ts`) before
`app.listen()`, so the server applies pending migrations on every startup, the same role
Flyway plays on Quarkus startup. `npm run db:migrate` (`server/scripts/db-migrate.ts`) remains
available as a standalone command for running migrations without starting the server (e.g.
against a remote environment ahead of a deploy). Both paths share the same `applyMigrations`
function, so there is exactly one migration code path.

Consequence: the server now requires `DATABASE_URL` to be set and Postgres reachable to start
at all — it exits with code 1 and a clear connection error rather than serving against a
stale/missing schema (verified: `ECONNREFUSED` surfaces cleanly with no listener bound). This
only affects `index.ts`; `createApp()` (used by `app.test.ts`) is untouched and still requires
no database.

Not yet addressed, worth revisiting once there is more than one server instance: Drizzle's
`migrate()` does not itself take a Postgres advisory lock, so two instances starting at the
same moment against an empty schema could race. Out of scope for this single-instance-dev
setup; flag it if/when a multi-instance deploy story comes up.

## Consequences
* `server/` depends on `drizzle-orm`, `drizzle-kit`, `pg`, `@types/pg`, `dotenv`.
* `server/docker-compose.yml` defines a single `postgres` service (`postgres:16-alpine`) for
  local dev and the spike; `server/.env.example` documents the matching `DATABASE_URL`.
  `.env` itself is git-ignored.
* `server/drizzle.config.ts` points `drizzle-kit` at `src/db/schema.ts`, output directory
  `drizzle/` — DB-MIGRATIONS-001 generates its first real migration into that directory.
* A minimal spike table (`spike_items`, `src/db/schema.ts`) proves the connect → define →
  query path end-to-end (`npm run db:spike`, `server/scripts/db-spike.ts`). It is throwaway —
  TENANT-001 defines the real `tenants`/`users` tables in its own migration and this table can
  be dropped then.
* The spike is a standalone script, not a unit test — `npm test` in both `client/` and `server/`
  stays green with no Postgres container running, verified by stopping
  `server/docker-compose.yml`'s container and re-running both suites.
* Every story from here on that reads/writes Postgres from `server/` uses Drizzle, unless a
  future ADR revises it.
