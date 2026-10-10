ID: BUG-BREADCRUMB-NAV

Status: DONE — accepted at sprint review 2026-09-28

Implemented (2026-09-27): new tenant-scoped `GET /api/quizzes/:quizId` (`server/src/routes/quizSessions.ts`,
`server/src/db/quizzes.ts`'s `findByIdWithCourseForTenant`); shared `client/src/components/Breadcrumb.tsx`
(route-driven via `matchPath`), rendered by `CourseDashboardPage`, `CourseDetailPage`,
`QuizSessionHistoryPage`, `QuizSessionMonitorPage`. Sessions-list page's trail ends at the quiz (no
session selected there); the session monitor page gets the full 4-segment trail, using the label
`Not started` for a session with no `startedAt` yet — both per this file's own flagged design
decisions, not yet re-confirmed with the human — see this sprint's `sprint.md`/`review.md` for the
explicit questions raised at review. Also note: the breadcrumb says `Not started` while the
sessions table's own cell (unchanged) says `not started yet` — same case, different casing/wording,
also not yet confirmed as intentional. Full unit suite green (220 server / 104 client tests,
including a new `Breadcrumb.test.tsx` and new server route tests) and the full existing Playwright
e2e suite green (13/13, no regressions from the breadcrumb/table changes). Verified end-to-end
against the real built app with 3 courses and 3 sessions (so multi-row layout is actually visible),
both light and dark `colorScheme` (the app stays visually pinned light either way) — screenshots in
`assets/BUG-BREADCRUMB-NAV/`:
[`courses-light.png`](assets/BUG-BREADCRUMB-NAV/courses-light.png),
[`course-detail-light.png`](assets/BUG-BREADCRUMB-NAV/course-detail-light.png),
[`sessions-list-light.png`](assets/BUG-BREADCRUMB-NAV/sessions-list-light.png),
[`session-monitor-light.png`](assets/BUG-BREADCRUMB-NAV/session-monitor-light.png) (dark
counterparts alongside each).

Steps To Reproduce:
1. Open `/courses` (Course dashboard) before selecting any `course`.
2. Select a `course` (e.g. "Seed Course").
3. From the course detail page, open a `quiz`'s Sessions list, then click into a specific `quiz
   session` (e.g. its monitor/history page).

Expected result:
A breadcrumb is present and correct at every step, letting the trainer navigate back up the
structure at any point, rendered by one shared, route-driven breadcrumb component (decided with
the human 2026-09-27 — not per-page duplication):
1. `Courses` alone, with no placeholder second segment, since nothing is "selected" on `/courses`
   (decided with the human 2026-09-27 — drop the "(no course selected)" text rather than keep it).
2. `Courses > Seed Course` — correct today.
3. `Courses > Seed Course > <Quiz title> > <Session start date/time>`, on both the Sessions-list
   page and the session monitor/history page. `<Quiz title>` links to the quiz's Sessions list
   (`/quizzes/:quizId/sessions`) — there is no separate quiz-detail page. `<Session>` is identified
   by its start date/time (e.g. "27/09/2026, 16:00"), matching the Started column already shown in
   the sessions table. Decided with the human, 2026-09-27.

Actual result:
1. `Courses > (no course selected)` is always shown on `/courses` — confirmed in code
   (`CourseDashboardPage.tsx`'s own comment: since COURSE-DETAIL-001, clicking a course row
   navigates straight to its detail page instead of "selecting" it in place, so nothing on this
   page is ever "selected" and the second breadcrumb segment is a permanent placeholder by
   design). The user finds this confusing/inconsistent even though it's intentional.
2. `Courses > Seed Course` — correct, rendered by `CourseDetailPage.tsx`.
3. The breadcrumb disappears entirely once a `quiz session` is opened, from both the Sessions list
   and a specific session's own page. Confirmed in code: a `<nav aria-label="Breadcrumb">` exists
   only in `CourseDashboardPage.tsx` and `CourseDetailPage.tsx` — `QuizSessionHistoryPage.tsx` and
   `QuizSessionMonitorPage.tsx` render no breadcrumb at all, so there is no way back to the
   `course`/`quiz` the trainer was working on except the browser's Back button.

Priority: Medium — a real navigation dead-end for trainers running a live class, though a browser
Back button is a workaround.

Effort: 5

Verification: manual — screenshot of the breadcrumb at each of the three steps above (`/courses`,
course detail, quiz session monitor/history), per `do_and_donts.md`'s screenshot rule for
GUI-touching changes.

Note:
User's own words: "I click a quiz session and it disappear, so I cannot go back to the course I
was working on. I click on a specific session and the breadcrumb is still missing so I cannot go
back in the structure."

Decided with the human (2026-09-27):
* build one shared, route-driven breadcrumb component (not per-page copies), used by
  `CourseDashboardPage.tsx`, `CourseDetailPage.tsx`, `QuizSessionHistoryPage.tsx`, and
  `QuizSessionMonitorPage.tsx`
* drop the "(no course selected)" placeholder entirely — `/courses` shows just `Courses`

Edge case flagged during grooming, not yet decided: the sessions table's own screenshot shows a
session that "not started yet" (`startedAt: null`) — `<Session start date/time>` has no value to
show for that case. Development should pick a reasonable fallback label (e.g. "Not started") and
flag it for human confirmation rather than leaving the segment blank or crashing.

This story also touches `QuizSessionHistoryPage.tsx`/`QuizSessionMonitorPage.tsx`, which
`TABLE-STYLE-001` touches too — flag that overlap at sprint planning per `do_and_donts.md`'s
sprint_26_08_20 entry on shared-page coupling.

Technical finding (grooming, 2026-09-27, confirmed by reading the code): neither
`GET /api/quizzes/:quizId/sessions` nor `GET /api/quiz-sessions/:sessionId` returns the quiz's
title or its `courseId` — there is no `GET /api/quizzes/:quizId` endpoint at all today. Building
the `Courses > <course> > <quiz> > <session>` trail on the Sessions-list and monitor/history pages
needs a new way to resolve quiz → course (and session → quiz for the monitor page), not just a
route param read. This affects both the design (still open, above) and the effort estimate.

Decided with the human at sprint planning (2026-09-27), not yet built (this PBI was left in the
backlog this sprint — see `TABLE-STYLE-001`'s own coupling note above): add a new, tenant-scoped
`GET /api/quizzes/:quizId` endpoint returning the quiz's title, `courseId`, and course title;
session → quiz is already covered today by `GET /api/quiz-sessions/:sessionId`'s existing
`quizId` field, so no change is needed there. Folded into this PBI rather than split into a
separate overhead PBI — small, self-contained addition (one route + one repository method).
Routing note (checked 2026-09-27): `client/src/main.tsx` uses a plain `<BrowserRouter>`/`<Routes>`
table (no `createBrowserRouter`/route `handle`), so the shared breadcrumb component cannot use
`useMatches` (data-router only) — build it on `matchPath`/`useParams` against a small ordered route
config instead. This doesn't touch ADR-0004's routing choice.

Implementation plan (sprint planning, 2026-09-27, see `active_sprint/sprint.md`):
* New server route `GET /api/quizzes/:quizId`, tenant-scoped like `GET /api/quiz-sessions/:sessionId`
  (`requireTenant` + a repository lookup joining `quizzes`→`courses` on `courses.tenant_id`),
  returning `{ id, title, courseId, courseTitle }`; unknown id and cross-tenant id both
  `404 quiz_not_found`.
* Shared `Breadcrumb` component, driven by a small ordered route config matched against the current
  path with `matchPath` (not `useMatches` — see the routing note above), rendered by
  `CourseDashboardPage`, `CourseDetailPage`, `QuizSessionHistoryPage`, `QuizSessionMonitorPage`.
* `/courses`: `Courses` only, no placeholder segment.
* `QuizSessionHistoryPage` (`/quizzes/:quizId/sessions`, nothing "selected" on this page): trail
  ends at `Courses > <course> > <quiz>` — fetches the new endpoint once on mount.
* `QuizSessionMonitorPage` (`/quiz-sessions/:sessionId`): full
  `Courses > <course> > <quiz> > <session>` trail — session's own `GET
  /api/quiz-sessions/:sessionId` (already fetched) gives `quizId`; the new endpoint resolves
  quiz→course; both one-shot on mount, outside the existing live-status polling loop (ADR-0009).
  Session segment: existing `formatDateTime` (already used by the sessions table's Started column),
  or the literal label `Not started` when `startedAt` is null.
* Remove the old per-page `<nav aria-label="Breadcrumb">` markup from `CourseDashboardPage`/
  `CourseDetailPage` once the shared component replaces it; update any existing test asserting the
  old `(no course selected)` text.
