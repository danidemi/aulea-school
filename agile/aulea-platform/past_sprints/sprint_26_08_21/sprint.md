# Sprint started 2026-08-21

## Scope
* ORM-SELECTION-001 — `story_orm_selection.md` (Effort 3)
* DB-MIGRATIONS-001 — `story_database_migrations.md` (Effort 3)

Total: 6 story points. Do ORM-SELECTION-001 first — DB-MIGRATIONS-001's migration tool
follows from the library it picks.

## Not in scope
* LOGIN-001 — `story_login.md` (stays in `backlog/`: Google OAuth Cloud project/client
  ID+secret/redirect URIs still not confirmed to exist, a DoR "cleared dependencies" gap
  reconfirmed during this grooming pass, 2026-08-21)
* TENANT-001 — `story_tenant_creation.md` (stays in `backlog/`: depends on both stories in
  this sprint's scope; picked up once they're DONE)
* SIGN-UP-001, COURSE-001, QTI-22-IMPORT, QUIZ-DASHBOARD-001, DEPS-001 (stay in `backlog/`:
  not selected this round — see grooming notes below)

## Goal
Settle the ORM/query-builder choice for `server/`'s PostgreSQL access, record it as an ADR
amendment to `adr/ADR-0002-persistence-and-iam.md`, prove it end-to-end with a spike, and set
up the matching migration tool with a first migration producing TENANT-001's `tenants`/
`users` schema. This unblocks TENANT-001, and transitively COURSE-001, QUIZ-DASHBOARD-001,
and QTI-22-IMPORT, none of which can touch persistence without this foundation.

## Grooming notes (2026-08-21)
* Resolved during this grooming pass: local Postgres for the spike (and local dev generally)
  runs via Docker Compose — closes ORM-SELECTION-001's last open question, moving it to READY.
* Resolved during this grooming pass: LOGIN-001's Google OAuth Cloud project is confirmed
  **not** set up yet — it stays DRAFT and out of scope; someone needs to create the OAuth
  project (client ID/secret, redirect URIs) before it can be groomed to READY.
* Sprint scope was chosen deliberately small and dependency-first: ORM-SELECTION-001 and
  DB-MIGRATIONS-001 are the two lowest-effort stories (3 points each) that also sit at the
  root of the backlog's longest dependency chain, so finishing them unblocks the most
  downstream work per point spent.
* Stories still not sprint-eligible and why: SIGN-UP-001 (hashing scheme / email delivery
  unspecified), COURSE-001 (pagination/empty-state unspecified, no front-end ADR), QTI-22-
  IMPORT (depends on QUIZ-DASHBOARD-001), QUIZ-DASHBOARD-001 (DoD still a stub). DEPS-001 has
  no open questions and is arguably READY on its own merits, but was left in `backlog/` to
  keep this sprint to its smallest useful scope — a candidate to pull into the *next* sprint
  or as a small addition if scope allows.
