ID: QUIZ-CONNECTION-INTEGRITY-001

Status: DONE

Priority: High — data-integrity bug: trainers currently see fabricated "needs manual
grading" rows for students who never took the quiz, which pollutes real class results.

Effort: 3

Depends on: none (extends `quiz_session_connections`/`GET .../results`, both already built by
QUIZ-SESSION-LIVE-STATUS-001 and QUIZ-AUTO-EVAL-001)

As:
a `trainer`

I want to:
the Quiz Session Monitor's Results (Block #3) to only ever show students who actually
submitted the quiz, and a `stopped` session to stop accepting new joins

So that:
I can trust the results list and class average as a true picture of who took the quiz,
instead of it being inflated by people who merely opened the link (before, during, or after
the session) without answering anything

Definition of Done:
* `GET /api/quiz-sessions/:sessionId/results` (Block #3's data source) only includes
  connections whose `submittedAt` is set — a connection that only ever joined (never called
  `.../submit`) is excluded from the `connections` list and from the `classAverage`
  computation entirely, regardless of when it joined (before start, during the running
  window, or after the session stopped)
* `joinedCount`/`submittedCount` on the Monitor page's live Blocks #1/#2 are unchanged by this
  story — those intentionally count every join, including the pre-start lobby count from
  QUIZ-SESSION-LIVE-STATUS-001's DoD. Only the post-stop Results table (Block #3) changes.
* a genuine "submitted with zero answers" attempt (a student who reached the end and clicked
  Submit without answering any question) still counts as a real result — it is not treated as
  a ghost. It appears in Block #3 with a real score (`0 / maxScore`), not excluded and not
  shown as "needs manual grading" for that reason alone.
* `POST /api/quiz-sessions/:sessionId/connections` (join) returns `409 Conflict` with
  `{ error: 'session_not_running', status: 'stopped' }` when the session's derived status is
  `stopped`, and creates no `quiz_session_connections` row in that case
  * joining while `closed` (not yet started) is unchanged — still succeeds and still counts
    toward `joinedCount`, per QUIZ-SESSION-LIVE-STATUS-001's existing, signed-off DoD; this
    story does not touch that path
  * joining while `running` is unchanged
* `QuizSessionTakePage`'s join call handles the new `409`: it renders the existing "This quiz
  session has ended" message (already built for the status-gate) instead of the generic
  "Could not join this session" error
* verification: automated —
  * server unit tests for `results`: a connection with only a join (no submit) is absent from
    the response; a connection with `submittedAt` set and zero `quiz_session_answers` rows is
    present with a `0` score, not excluded
  * server unit test for `connections` (join): returns `409`/creates no row when the target
    session is `stopped`; still `201`/creates a row when `closed` or `running`
  * client unit/e2e test: joining a `stopped` session's take-URL shows the "session has ended"
    message, not a join error

Known context (grooming, 2026-09-19):
* Reported by the human from a live Monitor page: a Results table showed several
  `needs manual grading` rows for connection ids that were never actually submitted.
* Root cause, confirmed by reading the code (not assumed): `POST .../connections` accepts a
  join in *any* session status by design — the code comment cites this as intentional, per
  QUIZ-SESSION-LIVE-STATUS-001's DoD, for the `closed` (pre-start lobby) case specifically.
  `GET .../results` (`listForSession`) separately lists every connection ever created for the
  session with no filter on whether it ever submitted. The two behaviors combine so that (a) a
  `stopped` session still silently accepts new joins, and (b) any connection that only ever
  joined — whenever that happened — shows up in the final Results table looking like an
  ungraded submission.
* Explicitly **not** a duplicate/conflict with QUIZ-SESSION-LIVE-STATUS-001: that story's
  "count a `closed`-state join" behavior is preserved as-is; only the `stopped`-state join and
  the Results table's filtering change here.
* Explicit correction from the human during grooming: a student who reaches the end of the
  quiz and submits without answering any question is a **legitimate** result (it demonstrates
  they didn't know the material), not a ghost — the fix must key off `submittedAt`, not off
  "has at least one answer row."
* No cleanup of already-created ghost rows in the database is in scope — this story only
  prevents new ones and fixes the results view going forward.

Reopened (grooming, 2026-09-20):
* This story was previously marked `DONE` and archived to `past_sprints/sprint_26_09_20_21_57/`
  on the human's sign-off, but none of its DoD is actually present in `aulea-platform`'s code:
  `POST .../connections` still creates a row unconditionally (no `stopped` check, no `409`);
  `listForSession` still returns every connection with no `submittedAt` filter; the client's
  "needs manual grading" label is still keyed off `maxScore === 0` alone, with no exception for a
  genuine zero-answer submission. `git log` shows no commit for this story at all. Reset to
  `READY` and moved back to `active_sprint/` to be actually implemented; the `review.md` from the
  false close was deleted.
* This also means `BUG-QUIZ-EMPTY-ANSWER-MANUAL-GRADING` (backlog) was never fixed by this story
  either, despite the story's own DoD claiming to cover it — see that bug file for the
  overlap note.

Implemented (sprint, 2026-09-20):
* `POST /api/quiz-sessions/:sessionId/connections` now derives status first and returns `409
  { error: 'session_not_running', status: 'stopped' }` without creating a row when `stopped`;
  `closed`/`running` unchanged (`server/src/routes/quizSessions.ts`).
* `GET .../results` filters `listForSession`'s rows to `submittedAt !== null` before scoring —
  ghost joins never reach the response or the class average.
* Client `QuizSessionMonitorPage` only shows "needs manual grading" when `hasUngraded &&
  maxScore === 0`, not `maxScore === 0` alone — a genuine zero-answer submission now renders
  `0 / 0`, a real (if unhelpful-looking) score, not a manual-grading flag. Note: the true
  denominator for a from-scratch zero-answer quiz is still `0`, not the quiz's actual total
  possible points, since `maxScore` is only ever summed from `quiz_session_answers` rows — see
  `BUG-QUIZ-EMPTY-ANSWER-MANUAL-GRADING`'s grooming note for that separate, deeper gap.
* `QuizSessionTakePage` treats a `409`/`stopped` join response the same as an already-`stopped`
  status fetch — renders the existing "This quiz session has ended" message.
* Tests added: 3 server tests for the join/409 behavior, 2 server tests for results
  filtering (ghost excluded, zero-answer included), 1 client test for the Monitor page's
  zero-answer rendering, 1 client test for the Take page's 409 handling. `tsc -b` and the full
  suites (161 server, 76 client) pass.
