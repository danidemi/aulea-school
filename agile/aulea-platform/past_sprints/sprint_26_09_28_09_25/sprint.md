# Sprint — 2026-09-27 (second sprint of the day)

## Selected PBIs

* `BUG-BREADCRUMB-NAV` — shared breadcrumb component, four pages.
* `TABLE-STYLE-001` — shared table component, same pages.

Both selected together, not split across sprints: `bug_breadcrumb_inconsistent_and_missing.md`'s
own note and `do_and_donts.md`'s sprint_26_08_20 coupling DON'T both flag that they touch the same
files (`QuizSessionHistoryPage.tsx`, `QuizSessionMonitorPage.tsx`, plus `CourseDashboardPage.tsx`/
`CourseDetailPage.tsx` for the breadcrumb, `QuizzesSection.tsx` for the table). Building them in
the same sprint, one after another in a single line of work (no parallel edits to the same files),
avoids two separate rounds of touching the same markup.

## No new ADR

* `TABLE-STYLE-001`'s shared `table.tsx` is a copy-in shadcn/ui component — already covered by
  ADR-0006, no new decision needed.
* `BUG-BREADCRUMB-NAV`'s breadcrumb is built on `matchPath`/`useParams` against a small ordered
  route config (confirmed against `client/src/main.tsx`'s plain `<BrowserRouter>`/`<Routes>` table
  — no `createBrowserRouter`, so no `useMatches`) — already covered by ADR-0004's routing choice,
  no new decision needed.

## TESTDATA-001 check

Neither PBI changes a data shape `server/scripts/db-seed.ts` relies on: the new
`GET /api/quizzes/:quizId` endpoint is additive (a new read), and the table restyle is
presentation-only. No seed-script update needed.

## Design decisions made during this planning pass

* **BUG-BREADCRUMB-NAV, session-list vs. session-page trail depth**: the PBI's Expected result #3
  literally reads as the full 4-segment trail on *both* the Sessions-list page and the session
  monitor/history page, but no session is "selected" on the list page — there's nothing for a 4th
  segment to name there. Building it as: Sessions-list page (`QuizSessionHistoryPage`, route
  `/quizzes/:quizId/sessions`) ends at `Courses > <course> > <quiz>`; the session page
  (`QuizSessionMonitorPage`, route `/quiz-sessions/:sessionId`) gets the full
  `Courses > <course> > <quiz> > <session>` trail. Flagging this interpretation for review rather
  than silently picking it.
* **New endpoint**: `GET /api/quizzes/:quizId`, tenant-scoped the same way
  `GET /api/quiz-sessions/:sessionId` already is (`requireTenant` + a `findByIdForTenant`-style
  repository lookup, unknown id and cross-tenant id both `404 quiz_not_found`), returning
  `{ id, title, courseId, courseTitle }`. Session → quiz needs no new lookup — the session page
  already fetches `GET /api/quiz-sessions/:sessionId`, which returns `quizId` today. Both fetches
  are one-shot on mount, not inside the monitor page's existing `POLL_INTERVAL_MS` live-status
  polling loop (ADR-0009) — the breadcrumb's data doesn't change while a session runs.
* **Not-started session's date segment**: `<Session start date/time>` shows the label
  `Not started` when `startedAt` is null (mirrors the sessions table's own existing `not started
  yet` cell text) — flagging for human confirmation per the PBI's own note, not treating it as
  settled.

## Verification plan (both PBIs)

1. Full unit/vitest suite green.
2. Disposable e2e harness (`client/e2e/run-e2e-server.sh`), real Playwright screenshots:
   * Breadcrumb at `/courses`, a course detail page, a quiz's sessions list, and one session's
     monitor page (including a not-started session, if the seed data has one).
   * Both tables (quiz list, sessions list) in **light and dark** `colorScheme` (Playwright context
     option) — the app is pinned `color-scheme: light` in CSS, so this screenshot pair is itself
     the check that the pinning holds under a `prefers-color-scheme: dark` preference, not a claim
     that a dark theme exists. TABLE-STYLE-001's own DoD asks for this explicitly; not waiving it
     the way the previous sprint's light-only apps were.
3. Screenshots saved to `active_sprint/assets/<PBI-ID>/`, per the skill's attachment convention.

## Git

No commit/branch for this sprint's work is being made now — the previous sprint's archive moves
are also still uncommitted on `sprint/260927`. All of it lands in the same working tree.
