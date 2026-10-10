ID: UAT-BOOTSTRAP-001

As:
a `human running UAT`

I want to:
one single script that brings up everything needed for a human-led UAT session from a clean
state — database, freshly built server, freshly built client

So that:
UAT can start immediately against a known-clean, fully-built stack, with no manual setup steps

Definition of Done:
* `./scripts/uat.sh` starts Postgres+Mailpit, waits for health, builds server and client,
  starts the built server — no other command needed first, and no separate migration step
  (the server already migrates on startup)
* works from a clean checkout; idempotent when re-run on top of an already-running stack
* documented in `aulea-platform/README.md`

Implemented (sprint, 2026-08-23):
* `scripts/uat.sh` (POSIX `sh`): `docker compose down -v` then `up -d` against
  `server/docker-compose.yml`, polls the postgres healthcheck (60s timeout), copies
  `.env.example` → `.env` if missing, `npm ci && npm run build` in both packages, then
  `exec npm start` in `server/`
* README gets a "Human-led UAT" section (port `:3000`, Mailpit `:8025`)
* run twice against real Docker: first run hit an unrelated stray process squatting on
  `:3000` (killed, not a script defect); second run completed clean; idempotency confirmed by
  both runs' teardown/recreate cycle
* not verified: a true from-scratch clean checkout with no `node_modules` anywhere yet
