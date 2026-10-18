# Sprint Review — 2026-10-18

## Outcome

All three PBIs accepted by the human, no changes requested:

* `BRANDING-001` → `DONE`
* `SIGNUP-CONFIRMATION-001` → `DONE`
* `TEST-INTEGRATION-001` → `DONE` (after the human supplied the green CI log)

Before sign-off, the DoD claims were checked against the source (`Wordmark.tsx`, `BrandBlock.tsx`,
`BrandIcon.tsx`, `SignUpConfirmation.tsx`, `client/public/` icons, `index.html` title,
`quizSessions.integration.test.ts`, `.github/workflows/integration-tests.yml`), per `do_and_donts.md`
(sprint_26_09_20).

## What was built

* `BRANDING-001`: Aulea.school identity: icon + `Wordmark` in the `App Header`, `Brand Block` with
  `Tagline` on login and home, `<title>`, favicons and web manifest, self-hosted Outfit font (ADR-0015).
* `SIGNUP-CONFIRMATION-001`: after a successful sign up the form is replaced by a "Check your email" /
  "Account created" view, so the form cannot be submitted twice.
* `TEST-INTEGRATION-001`: `deleteForQuiz` tested on real Postgres via testcontainers (ADR-0014), with a
  row-lock concurrency test, and a new GitHub Actions workflow `integration-tests.yml`.

## Observed

* CI had no test workflow before this sprint; the new one runs only `test:integration`, not the unit or
  e2e suites.
* The CI run (2026-10-16) was green: 7/7 tests in 8.04 s. Evidence: `assets/TEST-INTEGRATION-001/test-integration-ci.log`.
* The app has no dark theme; dark-mode screenshots use emulated `prefers-color-scheme` and look like the light ones.

## Retrospective

* DO: every table is sortable by default, built on one shared component.
* DON'T: one-off table markup per screen, or the PO restating "sortable" in each PBI.
* Result: new story `DATA-TABLE-001` in the backlog.
