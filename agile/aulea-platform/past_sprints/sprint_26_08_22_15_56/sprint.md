# Sprint started 2026-08-21

## Scope
* SIGNUP-EXPEDITE-001 — `story_expedite_sign_up.md` (Effort 3)
* SIGN-UP-001 — `story_sign_in_with_own_email.md` (Effort 8)

Total: 11 story points. Do SIGNUP-EXPEDITE-001 first — it builds the shared sign-up
screen/endpoint and the bcrypt password module that SIGN-UP-001 then extends with the
confirmation-email branch, rather than the two stories building overlapping code
independently.

## Not in scope
* LOGIN-001 — `story_login.md` (stays in `backlog/`: Google Cloud OAuth project/client
  ID+secret/redirect URIs still not confirmed to exist — unchanged since last grooming)
* TENANT-001, COURSE-001, QTI-22-IMPORT, QUIZ-DASHBOARD-001, DEPS-001 (stay in `backlog/`:
  not selected this round)

## Goal
Give the platform a working email/password path to become a `registered user`: a fast,
feature-flagged expedited path for manual testing (SIGNUP-EXPEDITE-001), and the full
confirmation-email flow for real users (SIGN-UP-001). Both write to the existing `users`
table (ORM-SELECTION-001/DB-MIGRATIONS-001, DONE in `past_sprints/sprint_26_08_21/`) and
share one bcrypt-based password module and one sign-up screen/endpoint instead of
duplicating them.

## Sprint planning (2026-08-21)
Both stories were grilled against DoR's "fully actionable, no open questions" bar before
being accepted into this sprint. Resolved during planning:
* **No auto-login on signup, in either story** — signing up with an email you don't own
  must not grant access; this is why the confirmation flow exists at all. This surfaced a
  gap: nothing in the backlog covers a returning email/password user actually logging back
  in. Added `backlog/story_login_with_email.md` (`LOGIN-EMAIL-001`, DRAFT, out of scope this
  sprint) to track it.
* Session mechanism (for the new login story, later): `express-session` + cookie.
* Client routing: `react-router-dom` introduced by SIGNUP-EXPEDITE-001 (first use in this
  codebase), routes `/`, `/signup`, `/confirm-result`.
* Feature-flag delivery: a `GET /api/config` endpoint, not a client-build-time env var —
  toggling `EXPEDITE_SIGNUP_ENABLED` only needs a server restart.
* bcryptjs (not native bcrypt) — avoids native build steps across dev/Docker/CI.
* Password minimum length: 8 characters (both stories, was "non-empty" only before
  planning).
* Confirmation token: separate `confirmation_tokens` table, SHA-256 hash of the raw token
  stored (not the raw token itself).
* Migration ownership: SIGNUP-EXPEDITE-001 adds `password_hash` + `confirmed_at` to `users`
  (needed first, since it ships first); SIGN-UP-001 adds only `confirmation_tokens`.
* Confirmation link base URL: new `APP_BASE_URL` env var, not derived from request headers.
* Full API contracts, routes, and migration shapes are now written out in each story's
  "Technical plan" section — see `story_expedite_sign_up.md` and
  `story_sign_in_with_own_email.md`.

## Grooming notes (2026-08-21)
* SIGNUP-EXPEDITE-001: no hard dependency found — Postgres/Drizzle/migrations already DONE,
  `users` table already exists. Standalone screen+endpoint, not gated on SIGN-UP-001.
  Password hashing scheme decided: bcrypt, in a shared module
  (`server/src/auth/password.ts`) so SIGN-UP-001 can reuse it. Moved DRAFT → READY.
* SIGN-UP-001: local SMTP mock decided — Mailpit (`axllent/mailpit`), to be added to
  `server/docker-compose.yml` (SMTP port 1025, web GUI port 8025) plus matching
  `server/.env.example` entries **when development picks the story up**, not during
  grooming — grooming stays doc-only per CLAUDE.md's Activity 1/3 split. DoD extended with
  token-based confirmation link (24h expiry) and its expired/reused-token error path. Moved
  DRAFT → READY. One open question remains, non-blocking: production SMTP provider, needed
  only past local dev.
* Both stories now cross-reference their shared screen/endpoint and shared password module
  in their own Notes sections, per the do/don't rule on catching shared-component coupling
  during grooming rather than later.
