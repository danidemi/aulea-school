# Sprint review — sprint_26_08_21

## Scope
* ORM-SELECTION-001 — choose the ORM/query-builder for `server/`'s PostgreSQL access.
* DB-MIGRATIONS-001 — set up a migration tool and a first migration.
* TENANT-001, SIGN-UP-001, COURSE-001, QTI-22-IMPORT, QUIZ-DASHBOARD-001, DEPS-001, LOGIN-001
  stayed in the backlog, deliberately not started this sprint (see sprint.md).

## What was done
* ORM/query-builder decision recorded as `adr/ADR-0003-orm-selection.md`: **Drizzle**
  (`drizzle-orm` + `drizzle-kit`) with the `pg` driver, over Prisma — plain-TypeScript schema,
  no codegen step, fits `server/`'s existing `NodeNext` ESM setup, and its `generate`/`migrate`
  split (vs. Prisma's own tooling) is what DB-MIGRATIONS-001 needed.
* `server/docker-compose.yml` — a `postgres:16-alpine` service for local dev and the spike;
  `server/.env.example` documents the matching `DATABASE_URL`; `.env` added to `.gitignore`.
* Spike (`server/scripts/db-spike.ts`, `npm run db:spike`): connected, defined one throwaway
  table (`spike_items`), inserted and read back a row — proved the path end-to-end.
* Migration tooling: `npm run db:generate` / `npm run db:migrate`
  (`server/scripts/db-migrate.ts`), backed by `drizzle-kit generate` + `drizzle-orm`'s
  `migrate()` — deliberately not `drizzle-kit push`, so migration files stay in version control
  and re-running is a no-op.
* First migration `server/drizzle/0000_loving_chamber.sql`: `tenants` (id, name unique,
  created_at) and `users` (id, email unique, `current_tenant_id` → tenants.id nullable,
  created_at) — the minimal shape ADR-0002 and TENANT-001's current draft support, not
  TENANT-001's full design (that story is still `DRAFT`).
* Extension requested mid-sprint: migrations now also apply automatically on server startup
  (`server/src/index.ts`, before `app.listen()`) — the same role Flyway plays on Quarkus
  startup. Documented as an addendum to ADR-0003. The server now requires `DATABASE_URL` and a
  reachable Postgres to start at all, and exits 1 with a clear error otherwise.
* Verified repeatedly against a clean Postgres (`docker compose down -v` / `up`): schema created
  once, second migration run is a true no-op (checked `\dt` and the `__drizzle_migrations`
  tracking table directly, not just the log). `npm test` and `npm run build` stayed green in
  both `client/` and `server/` throughout, with the Postgres container stopped.

## Decisions made during the sprint
* Local Postgres run method (an ORM-SELECTION-001 open question at grooming): Docker Compose.
* Auto-apply migrations on server startup, added after the two stories' original Definition of
  Done was already met — extended DB-MIGRATIONS-001 rather than opening a new story, since it's
  a small addition to the same migration path.

## Observed
* A real bug was found and fixed during this sprint, not in code review but from the human
  running the exact production path (`npm run build && npm start`) after the auto-migrate
  extension: an earlier `tsconfig.json` edit (adding `scripts/` and `drizzle.config.ts` to
  `include`, dropping `rootDir`) changed `tsc -b`'s output layout to `dist/src/index.js`
  instead of the previous flat `dist/index.js`. `tsc -b` doesn't delete outputs it no longer
  produces, so a stale pre-migration `dist/index.js` was left behind and `npm start`
  (`node dist/index.js`) kept running it — silently masking the new migration-on-startup
  behavior. My own verification up to that point had used `tsx src/index.ts` directly, which
  never exercises the compiled `dist/` path, so I didn't catch it myself.
  * Fix: reverted `tsconfig.json` to `rootDir: "src"` / `include: ["src"]`. `scripts/` and
    `drizzle.config.ts` don't need `tsc -b` at all — they already run via `tsx` and
    `drizzle-kit`'s own loader.
  * Re-verified through the exact `npm run build && npm start` path this time: DB down → exits
    1 with a clear `ECONNREFUSED`; fresh DB up → migrates, listens, serves `/healthz`.
* Several stray background `node`/`tsx` processes and a leftover Docker volume accumulated
  during manual verification across this sprint and had to be cleaned up by hand each time —
  worth a lighter-weight verification habit next sprint (see retrospective, if run).
* TENANT-001's schema needs are still underspecified (single tenant vs. membership) — the first
  migration's `users`/`tenants` shape is flagged in both the story and the ADR as likely to need
  a follow-up migration once TENANT-001 is groomed to READY.

## Outcome
ORM-SELECTION-001 and DB-MIGRATIONS-001 both accepted at sprint review on 2026-08-21. Status
set to DONE.
