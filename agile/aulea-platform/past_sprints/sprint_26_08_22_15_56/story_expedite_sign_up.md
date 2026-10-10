ID: SIGNUP-EXPEDITE-001

As:
a `developer`

I want to:
sign up with my email and password and have the account created and enabled immediately,
without the confirmation-link flow

So that:
I can quickly run manual tests

Definition of Done:
* `/signup` offers an "expedite sign up" option, gated behind `EXPEDITE_SIGNUP_ENABLED`
  (`GET /api/config`); `POST /api/signup/expedite` itself 403s when the flag is off regardless
  of the UI
* creates the account with `confirmed_at` set immediately, no confirmation email — but no
  auto-login: no session is created (signing in is LOGIN-EMAIL-001's job)
* duplicate email → 409; password < 8 chars → 400; passwords hashed with bcryptjs (cost 10)

Implemented (sprint, 2026-08-21):
* `server/src/auth/password.ts`, `server/src/db/users.ts`, `server/src/routes/signup.ts`
  (`GET /api/config`, `POST /api/signup/expedite`), migration `0001_futuristic_lethal_legion.sql`
  (`password_hash`, `confirmed_at`), `client/src/SignUpPage.tsx`, `main.tsx`
  (`react-router-dom` introduced — first routing in this codebase), `vite.config.ts` (dev
  `/api` proxy)
* tech decisions in `adr/ADR-0004-password-hashing-and-client-routing.md`
* found and fixed during manual verification against real Postgres: `isUniqueViolation` only
  checked `err.code`, but `drizzle-orm/node-postgres` wraps the raw `pg` error, putting the
  SQLSTATE on `err.cause.code` — duplicate-email returned 500 instead of 409 until fixed (the
  fake repository didn't reproduce this, only real Postgres did); added
  `server/src/db/users.test.ts` covering both shapes
* 16/16 server tests, 6/6 client tests passing; manual verification of every DoD bullet against
  real Postgres
