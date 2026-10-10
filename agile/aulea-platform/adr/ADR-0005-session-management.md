# ADR-0005: Session management for email/password sign-in

## Status
Accepted — 2026-08-22

## Context
AUTH-UX-001 introduces `POST /api/login`, the first endpoint that needs to keep a user
signed in across requests. ADR-0002 named `express-session` as the likely mechanism but did
not pick a session store. SIGNUP-EXPEDITE-001/SIGN-UP-001 deliberately do not create a
session on signup, so this is genuinely the first place a session is created.

Two options were on the table at sprint planning (2026-08-22):
* in-memory store (`express-session`'s default `MemoryStore`) — no new dependency, but
  sessions are lost on every server restart and don't work past one server instance.
* Postgres-backed store (`connect-pg-simple`) — survives restarts, consistent with ADR-0002's
  "one data-access pattern (plain Postgres)" preference for auth data.

## Decision
Use **`express-session` with `connect-pg-simple`** as the session store, backed by the same
Postgres database as the rest of the app (Drizzle/`pg`, per ADR-0003).

* Consistent with ADR-0002's rationale for building auth ourselves on plain Postgres, rather
  than mixing a durable data store for domain data with a volatile one for sessions.
  * Sessions survive a server restart — a real annoyance with `MemoryStore` in local dev,
    and a correctness problem in any deployment that restarts the process (e.g. after a
    deploy).
* Cost: one more runtime dependency (`connect-pg-simple`) and a `session` table (created by
  the library itself, or by a migration — decided when AUTH-UX-001 is implemented).

## Consequences
* `server/` gains `express-session` and `connect-pg-simple` as runtime dependencies.
* AUTH-UX-001 wires the session middleware into `server/src/app.ts`, pointed at the same
  Postgres connection Drizzle uses.
* LOGOUT-001 destroys sessions through this same mechanism — it has no store choice of its
  own to make.
* No rate limiting/lockout on failed logins is implemented alongside this (see
  `backlog/story_auth_ux.md`, decided the same day) — an explicit, logged gap, not an
  oversight.
* Revisit if the server ever runs as more than one instance behind a load balancer without a
  shared store — not a concern today, since `connect-pg-simple` already shares state through
  Postgres.
