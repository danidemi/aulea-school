ID: TEST-INTEGRATION-001

Status: DONE — accepted at sprint review 2026-10-18; green CI run attached

Priority: Medium

Effort: 5

Goal:
test the session-delete repository code (`deleteForQuiz`) against a real, ephemeral Postgres started automatically by the test run

Why:
the row locking, cascade order and tenant scoping of `deleteForQuiz` are covered today only by the e2e spec. The DB-free fake in `testSupport/fakes.ts` only mirrors them, so the unit tests could pass while the real SQL differs (gap noted at sprint review 2026-10-14, SESSION-DELETE-001). A repository-level test on real Postgres verifies them in seconds, without the full app stack.

Out of scope:
* repositories other than `deleteForQuiz` (a later PBI can extend the harness)
* moving route tests off the fakes

Definition of Done:
* a new ADR records the decision to adopt `testcontainers` with `@testcontainers/postgresql` for repository integration tests, and why PGlite was rejected (it does not reproduce real Postgres lock behaviour)
* `npm run test:integration` (in `server/`) starts one Postgres container per test file, applies the real migrations through the same `migrate.ts` used in production, runs the tests, and stops the container; it requires a running Docker daemon
* plain `npm test` stays DB-free and does not start Docker; integration tests are excluded from it
* integration tests cover `deleteForQuiz` on real Postgres, in given / when / then style: a `running` session is rejected and nothing is deleted; a session of another `Tenant` or another quiz is `not_found` and nothing is deleted; answers, `Connection`s and sessions are deleted in the right order with no FK error; `dryRun` returns the counts and deletes nothing; a failure on any id deletes nothing (all-or-nothing)
* one concurrency test shows a session cannot start between the `running` check and the delete (two transactions, the row lock blocks the second)
* a new CI job in the GitHub Actions workflow runs `npm run test:integration` separately from the existing jobs, and is green
* the existing unit suite (server and client) and the e2e suite stay green
* verified automatically; the evidence is the log of a green local `npm run test:integration` run and a green CI run, attached under `assets/TEST-INTEGRATION-001/`

Implementation plan (sprint planning, 2026-10-16):
* New ADR-0014 (Accepted): testcontainers + `@testcontainers/postgresql`; PGlite and a shared Postgres
  service rejected.
* `server/package.json`: dev dependencies `testcontainers`, `@testcontainers/postgresql`; script
  `test:integration` = `vitest run --config vitest.integration.config.ts`.
* `server/vitest.config.ts` (new): excludes `**/*.integration.test.ts`, so `npm test` stays DB-free.
  `server/vitest.integration.config.ts` (new): includes only `src/**/*.integration.test.ts`, with a long
  hook timeout for the container start, one fork per file.
* `server/src/testSupport/postgresContainer.ts` (new): starts `postgres:16-alpine`, runs
  `applyMigrations(url)` from `db/migrate.ts` (it uses `./drizzle` relative to `server/`, so the run
  starts from `server/`), returns the repository and a `stop()`.
* `server/src/db/quizSessions.integration.test.ts` (new), given / when / then: running session rejected;
  other `Tenant` / other quiz is `not_found`; delete order with no FK error; `dryRun`; all-or-nothing;
  one concurrency test with two transactions where the row lock blocks the second.
* CI finding: the repo has only `.github/workflows/docker-image.yml` (runs on version tags, builds an
  image). No workflow runs any tests today, so there are no "existing jobs" to stay separate from.
  Plan: a new workflow `.github/workflows/integration-tests.yml` (push and pull request on `master`,
  `ubuntu-latest`, Docker is preinstalled) with one job that runs `npm ci` and `npm run test:integration`
  in `aulea-platform/server`. Making it run unit and e2e too is out of scope.
* Needs from the human: pushing to GitHub so a CI run exists for the evidence. I will not push on my own.
* Local verification needs the Docker daemon (`docker` resolves to the Windows Docker Desktop binary in
  this WSL; availability will be checked live at the start of the sprint).

Implemented (2026-10-16):
* `server/package.json`: dev dependencies `testcontainers` and `@testcontainers/postgresql`; script `test:integration`. New `server/vitest.config.ts` (excludes `**/*.integration.test.ts`) and `server/vitest.integration.config.ts` (only those files, forks, 120 s hook timeout).
* `server/src/testSupport/postgresContainer.ts`: starts `postgres:16-alpine`, runs the production `applyMigrations`, returns `db`, `pool`, `stop()`.
* `server/src/db/quizSessions.integration.test.ts`: 7 given / when / then tests on real Postgres: delete order with no FK error (12 answers, 4 connections, 2 sessions); running session rejected, nothing deleted; other `Tenant` is `not_found` (through its own quiz and through the foreign quiz); other quiz of the same tenant is `not_found`; `dryRun` returns counts and deletes nothing; all-or-nothing with one unknown id; concurrency: a second transaction that has started the session (uncommitted) blocks the delete on the row lock (still pending after 500 ms), and after its commit the delete refuses with `running` and the session survives.
* Production code touched: `createSessionRepository(databaseUrl, connection = createDb(databaseUrl))` takes an optional connection, so the test owns and closes the pool (without it, stopping the container made the repository's idle pool throw an unhandled error). Production call sites are unchanged.
* The tests can fail: with `.for('update', ...)` removed from `deleteForQuiz`, the concurrency test fails (the started session is deleted) and the other 6 still pass. The change was reverted.
* CI: new `.github/workflows/integration-tests.yml` (push and pull request on `master`, `ubuntu-latest`, `npm ci` + `npm run test:integration` in `aulea-platform/server`). Action versions `checkout@v7` (as in `docker-image.yml`) and `setup-node@v6` are not verified until the workflow runs. The workflow has never run.
* Verification, local: `npm run test:integration` 7/7 in about 9 s ([log](assets/TEST-INTEGRATION-001/test-integration-local.log)); `npm test` in `server/` 230/230 with no Docker needed ([log](assets/TEST-INTEGRATION-001/npm-test-db-free.log)); client vitest 120/120; full Playwright suite 22/22 ([log](assets/TEST-INTEGRATION-001/e2e-full.log)); server `npm run build` ok. Docker 29.4.0 was checked live.
* CI: the new job ran on GitHub Actions on 2026-10-16 and is green, 7/7 tests in 8.04 s ([log](assets/TEST-INTEGRATION-001/test-integration-ci.log), excerpt of the `Run npm run test:integration` step pasted by the human). The DoD line "CI job is green" is met.
* do_and_donts applied: tool availability checked live; real Postgres exercised (the point of the PBI); logs attached to the PBI; disposable containers and ports, no manual `db:migrate`.
