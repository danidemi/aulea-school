ID: ORM-SELECTION-001

As:
a `maintainer` of aulea-platform

I want to:
choose the ORM/query-builder library used to read and write PostgreSQL from `server/`

So that:
every later story touching persistence builds on one settled data-access library

Definition of Done:
* a choice made between Prisma/Drizzle/other, recorded as an ADR
* a minimal spike proves the choice end-to-end against a local Postgres
* local Postgres runs via Docker Compose

Implemented (sprint, 2026-08-21):
* chose Drizzle + `pg` over Prisma — `adr/ADR-0003-orm-selection.md`
* `server/docker-compose.yml` (postgres:16-alpine), `server/.env.example` documents
  `DATABASE_URL`
* spike: `server/src/db/schema.ts`/`client.ts`/`scripts/db-spike.ts` (`npm run db:spike`) —
  inserted/read back a row against the Compose Postgres (spike table later dropped by
  TENANT-001 once superseded)
* verified: `npm test` green in both packages with Postgres stopped, `npm run build` clean
