ID: TESTDATA-001

Status: DONE

Priority: Medium

Effort: 3

As:
a `human tester`

I want to:
automatically seed the system with a small but representative set of test data — users, accounts, quizzes, and quiz attempts with both correct and incorrect answers — through some way I can trigger myself, without needing to know the internals of how to do it

So that:
I can quickly get the platform into a realistic, known state and run manual tests, instead of manually creating all this data by hand through the UI or asking a developer to do it for me each time

Technical plan (sprint planning, 2026-09-22):
* A standalone script (`server/scripts/db-seed.ts`, following the existing `db-migrate.ts`/
  `db-spike.ts` pattern — ADR-0003), invoked via `npm run db:seed` from `server/`. Drives the
  *real* HTTP API (sign-up/confirm, login, course creation, quiz upload from an existing
  `server/test-fixtures/qti-samples` package, session create/start/join/answer/submit/stop) rather
  than inserting rows directly — every seeded row goes through real scoring/grading, so
  `gradingStatus`/`score` can never drift from what the app itself would produce, and one bug fix
  to scoring can't silently desync the seed from reality.
* Seed data uses a fixed, recognizable tenant/email domain (e.g. `@seed.local` accounts under a
  `Seed Tenant` tenant) so re-running is a targeted delete-then-recreate scoped to that
  tenant/domain, never touching any other data the human's dev database holds. Includes at least
  two users, one quiz (built from an existing multi-select-containing fixture, so the seed also
  supplies real data for `BUG-ANSWER-BREAKDOWN-MULTISELECT`'s and `BUG-ANSWER-BREAKDOWN-BAR-MISALIGN`'s
  own verification screenshots), and quiz attempts covering a correct answer, an incorrect answer,
  and a partially-correct multi-select answer.
* Documentation: a short section in `server/README.md` (or created if absent) covering the command,
  what it produces, and that it's safe to re-run.

Definition of Done:
* a documented way exists for a human tester to trigger seeding of test data (`./scripts/seed.sh`,
  a thin wrapper next to `scripts/uat.sh` around `npm run db:seed`) without needing source-level
  knowledge
* the seeded data includes: at least a couple of users/accounts, at least one quiz, and quiz
  attempts covering correct, incorrect, and partially-correct (multi-select) answers
* seeding is repeatable (can be re-run to reset/refresh the test data) and does not require manual
  database edits; re-running only touches the seed's own fixed tenant/accounts, never other data
* the mechanism to trigger seeding and what data it produces is documented for testers
* verified manually: a tester with no codebase knowledge follows the documentation and successfully
  seeds the data end-to-end
