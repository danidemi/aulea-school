# Sprint Review — 2026-09-28

## Outcome

Both PBIs accepted by the human as-is, no changes requested:

* `BUG-BREADCRUMB-NAV` → `DONE`
* `TABLE-STYLE-001` → `DONE`

Human's words: "All PBIs developed successfully. Nothing to signal in the retrospective, sprint
has been done egregiously."

## What was built

* A shared, route-driven `Breadcrumb` component (`client/src/components/Breadcrumb.tsx`), replacing
  the two duplicated per-page breadcrumb blocks, rendered on `CourseDashboardPage`,
  `CourseDetailPage`, `QuizSessionHistoryPage`, and `QuizSessionMonitorPage`. `/courses` now shows
  just `Courses` (no placeholder). New tenant-scoped `GET /api/quizzes/:quizId` endpoint backs the
  quiz→course resolution the breadcrumb needs.
* A shared table component (`client/src/components/ui/table.tsx`, shadcn/ui copy-in per ADR-0006)
  used by every table in the client: full width, left accent bar, zebra striping, quiz-table header
  style, sessions-table padding. `CourseDashboardPage`/`CourseDetailPage` layout wrappers were
  widened to match.

## Decisions accepted at this review (flagged during development, now considered settled)

Both PBIs flagged a few interpretation calls for human confirmation rather than silently deciding
them. The human's blanket "developed successfully" sign-off is taken as confirming all of them:

* Sessions-list page's breadcrumb trail ends at the quiz (no session segment); only the session
  monitor/history page gets the full 4-segment trail.
* A session with no `startedAt` shows `Not started` as its breadcrumb segment (this still reads
  differently in casing from the sessions table's own `not started yet` cell text — left as a minor
  wording inconsistency, not re-raised as a defect).
* Moving `CourseDashboardPage`/`CourseDetailPage`'s "+ New course"/"Upload quiz" buttons to the far
  left, as a side effect of removing the `max-w-3xl`/`mx-auto` wrapper for the table restyle.
* `QuizSessionMonitorPage`'s Block #3 results table was intentionally left as plain markup (not
  migrated to the shared table component) since it's a small summary widget, not a data table.

## Verification

Full unit suite green (220 server / 104 client tests) and full Playwright e2e suite green (13/13),
no regressions. Manual verification against the real built app, 3 courses / 3 sessions, both light
and `colorScheme: dark` Playwright contexts (app stays visually pinned light either way).
Screenshots for both PBIs saved under `assets/BUG-BREADCRUMB-NAV/` and `assets/TABLE-STYLE-001/` in
this folder.

## Retrospective

Human confirmed nothing to signal — no new `do_and_donts.md` entry from this sprint.
