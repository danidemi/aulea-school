ID: QUIZ-SESSION-HISTORY-001

Status: DONE

Priority: Medium — no data-loss risk today (sessions are never deleted), but a trainer
currently has no way to reach a session again once they navigate away from it, which blocks
the documented "run the same quiz multiple times" use case.

Effort: 5

Depends on: none (extends `QuizzesSection`, `quiz_sessions` table, and reuses the existing
`QuizSessionMonitorPage` unmodified)

As:
a `trainer`

I want to:
see the list of past sessions for a given quiz, from the course's quiz list, and open any of
them again

So that:
I can review or re-check a quiz I already ran, and confidently start a new session for the
same quiz without losing track of previous runs — I currently can only reach the session I
most recently created, via the URL the "Create session" action redirected me to

Definition of Done:
* each quiz row in `QuizzesSection` (the course detail page's quiz list) gains a "Sessions"
  action/button alongside "Create session" / "Replace file" / "Delete"
  * always shown, even when the quiz has zero sessions yet (opens to an empty-state list, not
    hidden/disabled)
* clicking it navigates to a new page, `/quizzes/:quizId/sessions`, listing every session ever
  created for that quiz, newest first, showing per row: status (`closed` / `running` /
  `stopped`), started-at time (or "not started yet" if `closed`), stopped-at time (if
  `stopped`), and the join/submitted counts already computed for the Monitor page
    (`joinedCount`/`submittedCount`)
  * a session with zero rows in the quiz's history renders a clear empty state ("No sessions
    yet for this quiz.") rather than an empty table
* each row links to that session's existing `QuizSessionMonitorPage`
  (`/quiz-sessions/:sessionId`) — this story adds no new per-session page; Monitor/Results are
  reused exactly as they are today
* the existing "Create session" button/flow on `QuizzesSection` is unchanged (still creates a
  session and redirects straight to its Monitor page)
* verification: automated —
  * new server endpoint `GET /api/quizzes/:quizId/sessions` (tenant-scoped, same guard pattern
    as the rest of `quizSessions.ts`): unit tests for empty list, multiple sessions
    newest-first ordering, and the malformed-id → 404 pattern (ROUTE-ID-GUARD-001)
  * new `QuizSessionHistoryPage` component test: empty state, populated list with correct
    per-row fields, link navigates to the right Monitor page
  * `QuizzesSection` test: "Sessions" button present per row, navigates to
    `/quizzes/:quizId/sessions`

Known context (grooming, 2026-09-19):
* Confirmed by reading the code: no session-listing endpoint exists today
  (`server/src/routes/quizSessions.ts` has no `GET /api/quizzes/:quizId/sessions`), and
  `QuizzesSection`'s "Create session" always navigates straight to the newly created session
  with no way back to an older one — this is a genuine gap, not an already-built-but-unwired
  feature.
* Scope explicitly limited to a list + link-through: no new per-session UI, no editing/deleting
  past sessions, no aggregate cross-session reporting (e.g. average across all runs of the same
  quiz) — those are potential future PBIs if the human asks for them.
* Wireframe drawn at sprint planning (2026-09-20), per the `do_and_donts.md` sprint_26_08_20
  entry:

```
QuizzesSection row (existing table, unchanged columns) gains one more action:
  | Title | Uploaded | Status | Actions                                            |
  | Quiz1 | ...      | ready  | [Create session] [Sessions] [Replace file] [Delete]|

/quizzes/:quizId/sessions  (new page, reuses AppHeader + Card, matches QuizzesSection's table style)
+----------------------------------------------------------------+
| AppHeader                                                       |
+----------------------------------------------------------------+
| Sessions for "<quiz title>"                                     |
|                                                                  |
| [Card, full width]                                              |
| +--------------------------------------------------------------+
| | Status   | Started         | Stopped          | Joined/Submit|
| |----------|------------------|------------------|--------------|
| | stopped  | 2026-09-20 10:00 | 2026-09-20 10:30 |   12 / 10    | -> click row: /quiz-sessions/:id
| | running  | 2026-09-20 11:00 | —                |    5 / 2     | -> click row: /quiz-sessions/:id
| | closed   | not started yet  | —                |    0 / 0     | -> click row: /quiz-sessions/:id
| +--------------------------------------------------------------+
|                                                                  |
| (zero sessions:)                                                |
| "No sessions yet for this quiz."                                |
+----------------------------------------------------------------+
```

  Each row is the whole clickable link target (not a separate "open" button/column) — consistent
  with there being exactly one action per row (open Monitor), unlike `QuizzesSection`'s multiple
  per-row actions. Table styling matches `QuizzesSection`'s existing table
  (`border-collapse`/`rounded-card`/`border-border`/`bg-ink-50` header), per ADR-0006.

Implemented (sprint, 2026-09-20):
* `server/src/db/quizSessions.ts`: `SessionRepository` gains `listForQuiz(quizId, tenantId)` —
  `null` if the quiz doesn't exist/isn't owned by the tenant, else every session for it newest
  first (`orderBy(desc(createdAt))`). Wired into `app.ts`'s lazy repository and the fake in
  `testSupport/fakes.ts`.
* `server/src/routes/quizSessions.ts`: new `GET /api/quizzes/:quizId/sessions`, tenant-guarded,
  reuses the existing `toResponse` helper per session (so the shape matches every other session
  response exactly) plus `connections.countsForSession` for `joinedCount`/`submittedCount`.
* `client/src/QuizSessionHistoryPage.tsx` (new): the wireframe above, as a table inside a `Card`;
  each row's `onClick` navigates to `/quiz-sessions/:id`. Wired into `main.tsx` at
  `/quizzes/:quizId/sessions`.
* `client/src/components/QuizzesSection.tsx`: new "Sessions" button per row, always shown,
  navigating to the history page.
* Tests added: 6 server tests (401, empty list, newest-first ordering, counts, cross-tenant 404,
  malformed-id 404), 5 client tests for `QuizSessionHistoryPage` (empty state, populated list
  fields, row-click navigation, signed-out prompt, load error), 1 client test for
  `QuizzesSection`'s new button. Full suites (167 server, 85 client) and `tsc -b` pass on both
  packages.
