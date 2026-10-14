ID: TEST-INTEGRATION-001

Status: DRAFT

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
