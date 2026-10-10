ID: E2E-BROWSER-001

As:
a `developer` (and, by extension, the human reviewing sprint work)

I want to:
an actual browser click-through test suite (Playwright) covering the platform's screens,
runnable as part of verification

So that:
sprint reviews stop relying only on curl/mocked-fetch checks for "reachable/usable in a
browser" claims

Definition of Done:
* `@playwright/test` wired into `aulea-platform` with an `npm run test:e2e` script running
  headless against a disposable dev-server instance + clean Postgres
* at least one click-through test per screen shipped so far (`/`, `/signup`, `/login`,
  `/courses`, course detail), each reached via UI navigation only, never a typed URL
* documented in `README.md`

Implemented (sprint, 2026-08-23):
* isolated `docker-compose.e2e.yml` (separate compose project, host port 5433, no named
  volume) rather than reusing the dev compose file, to actually guarantee no collision with a
  developer's running stack
* `vite.config.ts`'s vitest `test.exclude` gained `e2e/**` (otherwise vitest tried to run the
  Playwright specs itself)
* 5 spec files (`home`, `signup`, `login`, `courses`, `course-detail`) plus a shared
  `signUpAndLogIn` helper, all UI-navigation-only
* `npm run test:e2e` run twice: 6/6 passed both times (~19s each), disposable containers/volume
  confirmed gone after each run, dev stack stayed up and untouched
* known benign noise: an unhandled Postgres-pool error logged to stderr when Playwright kills
  the webServer at the end of a run — cosmetic, not a test failure
