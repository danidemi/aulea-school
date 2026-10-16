# ADR-0014: Repository integration tests on real Postgres with testcontainers

## Status
Accepted — 2026-10-16 (decision recorded in TEST-INTEGRATION-001's Definition of Done, confirmed by the Product Owner)

## Context
The row locking, cascade order and tenant scoping of `deleteForQuiz` (`server/src/db/quizSessions.ts`)
are covered only by the e2e spec. The DB-free fake in `server/src/testSupport/fakes.ts` mirrors them,
so unit tests can pass while the real SQL differs (gap noted at the SESSION-DELETE-001 review).

Three options were considered:
* **PGlite** (in-process WASM Postgres): fast, no Docker. Rejected: it is single-connection and does
  not reproduce real Postgres lock behaviour, which is exactly what must be verified.
* **A shared Postgres service** (the `docker-compose.yml` one, or a CI service container): no new
  dependency. Rejected: tests share state, need manual cleanup, and cannot get a clean database per
  test file.
* **`testcontainers` with `@testcontainers/postgresql`**: a real, ephemeral Postgres per test file,
  started and stopped by the test run itself.

## Decision
Use **`testcontainers`** and **`@testcontainers/postgresql`** as `server/` dev dependencies for
repository integration tests.

* One container per test file, image `postgres:16-alpine` (same major version as `docker-compose.yml`).
* Migrations are applied with `applyMigrations` from `server/src/db/migrate.ts`, the same code used in
  production.
* Integration tests live in `*.integration.test.ts` files and run only with `npm run test:integration`.
  `npm test` excludes them and stays DB-free.

## Consequences
* A running Docker daemon is required for `npm run test:integration` (locally and in CI).
* `server/` gains a second vitest config for the integration run.
* CI runs them in a separate workflow, `.github/workflows/integration-tests.yml` (no test workflow existed before).
* Route tests stay on the fakes. Other repositories can adopt the harness in later PBIs.
