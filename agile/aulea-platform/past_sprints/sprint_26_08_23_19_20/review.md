# Sprint review — sprint started 2026-08-23 (afternoon), closed 2026-08-23 (evening)

## Outcome

All 4 scoped stories accepted as DONE by the human, no rejections.

* **QTI3-MIGRATION-001** — hard cutover of quiz upload/validation from QTI 2.2 to QTI 3.0
  (`validateQti3.ts` replacing `validateQti22.ts`), per new **ADR-0007**. 85/85 server tests
  green; manually verified by uploading real QTI 3.0 samples against a running server.
* **QTI-UAT-SAMPLES-001** — 6 fixed QTI 3.0 sample files (3 accept, 3 reject) at
  `server/test-fixtures/qti-samples/`, consumed by validator tests and manually uploaded
  through the real API with the expected accept/reject outcome each time.
* **COURSE-DETAIL-001** — new `/courses/:courseId` course detail page (breadcrumb + quizzes
  section), replacing the old select-then-"View quizzes" flow. 89/89 server + 50/50 client
  tests green; manually verified with two real courses against a running server.
* **E2E-BROWSER-001** — Playwright click-through suite covering all 5 shipped screens, run
  against its own isolated disposable Postgres. Run twice for real, 6/6 passing both times,
  confirmed to never touch a developer's own running dev stack.

No stories were rejected. One new ADR was written (ADR-0007, QTI3-MIGRATION-001's hard
cutover) — as anticipated at planning; no other tech-stack changes this sprint.

## Discovered during development, not in this sprint's scope

Manual verification of COURSE-DETAIL-001 surfaced a pre-existing bug (predates this sprint):
a malformed/non-UUID course id crashes the whole server process, via `quizzes.ts`'s
unguarded `authorizeCourse` call into `findByIdForTenant`. Not fixed here — filed as a new
backlog story, **ROUTE-ID-GUARD-001** (`DRAFT`, not yet groomed), immediately after this
sprint's work was reported.

## Retrospective

[to be completed — see next step]
