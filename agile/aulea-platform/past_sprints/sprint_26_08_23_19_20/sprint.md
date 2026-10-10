# Sprint plan — sprint started 2026-08-23 (afternoon)

## Scope

All 4 remaining backlog stories, at the human's explicit request (2026-08-23):

* **QTI3-MIGRATION-001** (`story_qti3_migration.md`) — hard cutover of quiz
  upload/validation from QTI 2.2 to QTI 3.0
* **QTI-UAT-SAMPLES-001** (`story_qti_uat_sample_files.md`) — 6 fixed QTI 3.0 sample files
  (3 accept, 3 reject) for UAT and automated tests
* **COURSE-DETAIL-001** (`story_course_detail_page.md`) — course detail page
  (`Courses > <name>` breadcrumb + quizzes section), replacing today's
  select-then-"View quizzes" flow
* **E2E-BROWSER-001** (`story_browser_e2e_testing.md`) — Playwright click-through suite
  covering every shipped screen

Nothing left in `backlog/` after this — only the story template remains.

## Development sequence

Fixed by the stories' own dependencies:

1. **QTI3-MIGRATION-001** first — `QTI-UAT-SAMPLES-001` has nothing to validate "accept"
   against until this ships (hard dependency, recorded in both story files)
2. **QTI-UAT-SAMPLES-001** — depends on 1
3. **COURSE-DETAIL-001** — independent of 1/2; depends only on `COURSE-001`, which is
   already `DONE` (previous sprint)
4. **E2E-BROWSER-001** last — deliberately scheduled after COURSE-DETAIL-001 so its
   course-detail spec targets the route that will actually exist
   (`/courses/:courseId`, not the `/courses/:courseId/quizzes` route COURSE-DETAIL-001
   removes)

## Technical decisions made at planning (2026-08-23)

* **One new ADR this sprint**: `adr/ADR-0007-qti-3-0-cutover.md`, per QTI3-MIGRATION-001's
  own DoD requirement — records the hard-cutover decision and its stated (not yet
  independently verified) motivation.
* No other ADRs needed: COURSE-DETAIL-001 reshapes existing routing/components only;
  E2E-BROWSER-001 wires in a dependency (`@playwright/test`) already present at the outer
  repo level, into `aulea-platform` itself — not a new tech-stack element.
* COURSE-DETAIL-001 extracts `QuizDashboardPage.tsx`'s logic into a
  `components/QuizzesSection.tsx` taking `courseId` as a prop, reused by the new
  `CourseDetailPage.tsx` — see that story's own technical plan for the full route/component
  reshape.
* QTI3-MIGRATION-001 renames `validateQti22.ts` → `validateQti3.ts` in place (same
  structural-validation scope, no full XSD validation) rather than adding a second
  validator alongside — consistent with the hard-cutover (no dual-format) decision.

## Cross-cutting notes

* This is a larger sprint than the previous one (4 stories vs. 3) — chosen deliberately at
  the human's request to clear the entire backlog in one sprint, not because CLAUDE.md's
  "choose the smallest possible subset" guidance was reconsidered. Flagging this explicitly
  since it's a deviation from that default, made by explicit human instruction.
* Every dependency between these 4 stories is already resolved by the sequence above; no
  story in this sprint is blocked on work outside the sprint.
