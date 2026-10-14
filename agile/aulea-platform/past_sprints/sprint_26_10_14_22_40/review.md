# Sprint Review — 2026-10-14

## Outcome

Both PBIs accepted by the human as-is, no changes requested:

* `SIGNUP-002` → `DONE`
* `SESSION-DELETE-001` → `DONE`

Before sign-off, the DoD claims were checked against the source (`signup.ts`, `SignUpPage.tsx`,
`routes/quizSessions.ts`, `db/quizSessions.ts`, `e2e/quiz-session-delete.spec.ts`) and the
screenshots, per `do_and_donts.md` (sprint_26_09_20).

## What was built

* `SIGNUP-002`: "Confirm password" field on the sign-up form. Inline mismatch error on blur and on
  submit; both submit buttons disabled while the values differ. Both signup endpoints return 400
  `password_mismatch` when `passwordConfirmation` is missing or differs, checked after
  `password_too_short` and before hashing.
* `SESSION-DELETE-001`: multi-select delete of `Quiz Session`s on `QuizSessionHistoryPage`.
  `POST /api/quizzes/:quizId/sessions/delete` (with `dryRun`) deletes answers, `Connection`s, then
  sessions in one transaction with row locks, scoped to quiz and tenant. 409 `session_running` if
  any selected session is running; nothing is deleted on any error. New shadcn `Checkbox` and
  `Dialog` components.

## Decisions accepted at this review

* Delete checkboxes live on the per-quiz history page, not on a single global session list.
* `closed` and `stopped` sessions are deletable; `running` is blocked.
* No migration: FKs stay `ON DELETE no action`; the cascade is done in code.
* The e2e match step for sign-up uses "Expedite sign up" because the e2e stack has no SMTP
  (pre-existing).

## Verification

Server 230 passed, client 111 passed, `tsc` clean, full e2e 13 passed on the disposable stack.
Screenshots under `assets/SIGNUP-002/` and `assets/SESSION-DELETE-001/`.

Known gap: the real repository SQL (locking, cascade order) is covered only by the e2e spec, not by
DB-free unit tests.

## Retrospective

Not yet run.
