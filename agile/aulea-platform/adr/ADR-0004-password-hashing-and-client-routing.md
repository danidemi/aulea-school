# ADR-0004: Password hashing library and client-side routing

## Status
Accepted — 2026-08-21

## Context
`SIGNUP-EXPEDITE-001` and `SIGN-UP-001` add email/password sign-up
(`active_sprint/`). Two stack gaps had to be closed before writing code:
* passwords must be hashed before being stored in `users.password_hash`
  (ADR-0002 already decided users live in Postgres, not an off-the-shelf
  IAM product, but not with what hashing library)
* the client (`client/src/App.tsx`) has no routing at all yet — HOME-001
  only ever needed one page. `/signup` is the first second page.

## Decision
* **Password hashing: `bcryptjs`, cost factor 10.** Chosen over native
  `bcrypt` because `bcryptjs` is pure JavaScript — no `node-gyp`/native
  build step to keep working across local dev, Docker, and CI. Cost
  factor 10 is bcrypt's common default, a reasonable balance of hashing
  time vs. brute-force resistance for this stage of the project.
* **Client routing: `react-router-dom`, pinned to `^6.30.6` (not the
  current v7 line).** v7 declares `engines.node >= 20`; this environment
  runs Node 18.19.1. v6 has no such floor and is a stable, widely used
  API. `<BrowserRouter>` and the route table live in `client/src/main.tsx`;
  `App.tsx` stays the plain `/` page component, unchanged, so it keeps
  rendering standalone in tests with no `<Router>` ancestor.

## Consequences
* `server/package.json` gains `bcryptjs` as a runtime dependency; no
  `@types/bcryptjs` — the package ships its own types, the stub package
  warns about this on install.
* `client/package.json` gains `react-router-dom@6`. Revisit the v7 pin
  once the project's Node baseline moves to 20+.
* Any future story adding more client pages/routes extends the route
  table in `main.tsx` rather than introducing a second router.
