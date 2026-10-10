ID: QUIZ-AUTO-EVAL-001

Status: DONE

Priority: Medium-High — completes the value of QUIZ-TAKE-RENDER-001 (a recorded-but-never-
scored answer is of limited use to either the student or the trainer).

Effort: 3 (revised at sprint planning, 2026-09-17 — down from grooming's 5. ADR-0011 adopted
`@longsightgroup/qti3-*` for QUIZ-TAKE-RENDER-001, and this story reuses `qti3-core`'s
`createItemSession`/`session.score()` for `qti-choice-interaction` scoring instead of
hand-writing it, per the spike's §5 finding — the original effort's condition no longer
holds.)

Depends on: QUIZ-TAKE-RENDER-001 (needs real recorded answers to evaluate)

As:
a `student` and a `trainer`

I want to:
have my quiz answers automatically evaluated against the correct response defined in the QTI
item, as soon as I submit the whole quiz

So that:
I (the student) see my result right away instead of not knowing how I did, and I (the
trainer) can see how the class performed without grading anything by hand for the question
types that support it

Definition of Done:
* on final submit of a quiz session take-attempt, every answered `qti-choice-interaction`
  item is scored automatically against that item's QTI-declared correct response
  (`qti-correct-response`) — correct/incorrect per item, plus a total score for the attempt
* the student sees their own score immediately on the post-submit confirmation screen (not
  just "submitted", the actual result)
* the trainer's Quiz Session Monitor page (QUIZ-SESSION-CONTROL-001/
  QUIZ-SESSION-LIVE-STATUS-001) shows per-student and/or aggregate results once the session
  has stopped — exact shape (list of students with scores, class average, score
  distribution, ...) to be decided at sprint planning/wireframe, not assumed here
* an item whose interaction type is not auto-gradable (i.e. anything outside this story's
  scored scope) is recorded but left in an explicit "needs manual grading" / ungraded state
  — never silently scored as 0, never silently dropped, never blocks the rest of the
  attempt's auto-gradable items from being scored
  * no manual-grading UI is built by this story — that's future work if/when a non-
    auto-gradable interaction type actually appears in authored content (today's fixtures
    only use `qti-choice-interaction`, which is auto-gradable, so this path may not be
    exercised by real content yet, but the behavior must still be defined and tested)
* re-opening a stopped session (existing reopen capability from QUIZ-SESSION-CONTROL-001)
  and a student retaking it produces a new, independently-scored attempt — does not overwrite
  or average with a prior attempt
* verification: automated — unit tests covering a fully-correct attempt, a fully-incorrect
  attempt, a mixed attempt, and (if QUIZ-TAKE-RENDER-001 ships any non-gradable item type by
  then) an ungraded-item case

Known context (grooming, 2026-09-13):
* Deliberately split out from QUIZ-TAKE-RENDER-001 at the human's request — render/record
  and evaluate are independently shippable and testable.
* Evaluation timing decided at grooming: on final submit only (not per-question), student
  sees their own score immediately.

Wireframes (ASCII, drafted and approved at sprint planning, 2026-09-17):

* Trainer's Quiz Session Monitor page, new Block #3 (shown only once the session is
  `stopped`, below the existing Block #1/#2 — does not touch either):
  ```
  ┌───────────────────────────────────────┐
  │  Block #3 — Results (stopped only)     │
  │ ─────────────────────────────────────  │
  │  Class average: 6.4 / 10               │
  │ ─────────────────────────────────────  │
  │  Student (connection)     Score        │
  │  conn-a1b2...               8 / 10     │
  │  conn-c3d4...               5 / 10     │
  │  conn-e5f6...        needs manual      │
  │                       grading           │
  │  ...                                    │
  └───────────────────────────────────────┘
  ```
* Student's post-submit confirmation screen (extends QUIZ-TAKE-RENDER-001's confirmation
  screen — same screen, this story adds the line below the checkmark):
  ```
  ┌───────────────────────────────────────┐
  │                                         │
  │           ✓ Quiz submitted!            │
  │                                         │
  │  ─────────────────────────────────     │
  │   Your score: 7 / 10                   │
  │                                         │
  └───────────────────────────────────────┘
  ```

Technical plan (sprint planning, 2026-09-17):
* Scoring engine: `@longsightgroup/qti3-core`, pinned to exactly `0.10.5` matching
  QUIZ-TAKE-RENDER-001's client-side pin (per ADR-0011), used server-side only —
  `server/package.json` gains it as a runtime dependency. For each `quiz_session_answers`
  row (written by QUIZ-TAKE-RENDER-001) whose item is `qti-choice-interaction`:
  `parseQtiXml(itemXml)` → `createItemSession(parsed.document)` → `session.respond('RESPONSE',
  storedResponse)` → `session.score()` → persist the resulting `SCORE` outcome. Runs
  server-side, triggered on final submit (the existing `POST .../submit` call), not
  client-side — client-side `scoreAttempt()` is preview-only per the spike's §5 finding and
  is not treated as authoritative here.
* An answer whose item's interaction type is not `qti-choice-interaction` is already
  written by QUIZ-TAKE-RENDER-001 with `gradingStatus: 'ungraded'` (its interaction-type
  gate, see that story's technical plan) — this story never receives such a row as
  `'pending'`, so it has nothing to score for it and leaves it as `'ungraded'` untouched.
  Exercised by the new `sample-accept-text-entry-unsupported.xml` fixture end to end: TAKE-
  RENDER writes the `'ungraded'` row, this story confirms it's excluded from scoring and
  surfaced in Block #3's "needs manual grading" cell.
* `quiz_session_answers`'s `gradingStatus`/`score` columns are owned by QUIZ-TAKE-RENDER-001
  (created with that story's table) — this story only ever transitions a `'pending'` row to
  `'graded'` with a `score` value, on final submit, for `qti-choice-interaction` rows. It
  never creates rows or alters the column shape.
* On final submit (extending the existing `POST
  /api/quiz-sessions/:sessionId/connections/:connectionId/submit`, which QUIZ-TAKE-RENDER-001
  already calls to mark the connection `submitted`): after marking the connection, this
  story scores every `'pending'` `quiz_session_answers` row for that `connectionId` via
  `qti3-core` as described above, setting `score` and `gradingStatus: 'graded'`.
  Per-connection `totalScore` = sum of `graded` rows' `score`; `maxScore` = sum of *every*
  row's `maxScore` for that connection, `'ungraded'` rows included at their written value of
  `0` (per QUIZ-TAKE-RENDER-001's plan) — so an ungraded item's `1` possible point is simply
  never in the denominator, rather than being excluded after the fact. The submit response
  gains a `result` field: `{ totalScore, maxScore, itemResults: [{itemIdentifier,
  gradingStatus, score, maxScore}] }` — this is what the confirmation screen's score line
  (wireframe below) renders from directly, no extra round-trip.
* New endpoint `GET /api/quiz-sessions/:sessionId/results` (trainer-side, tenant-scoped,
  mirrors the rest of `quizSessions.ts`'s routing — deliberately separate from `GET
  /api/quiz-sessions/:sessionId` rather than folded into it, since results only exist once
  `stopped` and every other session field is needed well before that): while `closed` or
  `running`, returns `409 Conflict` (not yet available, not an authorization question, so
  not `403`) with a body naming the current status; once `stopped`, returns `{
  connections: [{connectionId, totalScore, maxScore, hasUngraded}], classAverage }`, where
  `classAverage` is the mean of each connection's own `totalScore / maxScore` ratio (not a
  mean of raw `totalScore`s), so connections that hit a different number of ungraded items
  don't skew the average via mismatched denominators; a connection with `maxScore: 0` (every
  item ungraded) is excluded from `classAverage`'s mean entirely, not treated as a `0`. Block
  #3 fetches this once, on the same status transition that already reveals Block #2's
  post-stop state (`QuizSessionMonitorPage.tsx`'s existing status-gated rendering) — no new
  polling needed, results don't change after the session is stopped.
* Reopen/retake: a new session-start (per QUIZ-SESSION-CONTROL-001's existing reopen
  mechanism) does not touch prior `quiz_session_connections`/`quiz_session_answers` rows —
  a student who joins and takes it again gets a new `connectionId` and a fresh, independently
  scored set of answer rows, satisfying this DoD's "new, independently-scored attempt"
  requirement for free, the same way QUIZ-SESSION-LIVE-STATUS-001's join-count accumulation
  was satisfied for free by reopen not touching that table.
* Testing: server-side unit tests for `qti3-core`-backed scoring (fully-correct,
  fully-incorrect, mixed, and — using the new text-entry fixture — an ungraded-item case),
  plus a Block #3 rendering test per state (hidden until stopped, populated once stopped)
  extending `QuizSessionMonitorPage.test.tsx`. No new e2e spec required beyond the
  QUIZ-TAKE-RENDER-001 rewrite of `quiz-session-take.spec.ts`/`quiz-session-monitor.spec.ts`,
  which should assert the real score appears once this story lands.
* Sequenced after QUIZ-TAKE-RENDER-001 (dependency — needs real `quiz_session_answers` rows
  to score).

Implementation notes (development, 2026-09-17):
* Block #3's wireframe showed "Class average: 6.4 / 10" — an illustrative
  number assuming every connection shares the same denominator. Since
  `classAverage` is actually a mean of each connection's own
  `totalScore/maxScore` *ratio* (no shared denominator once connections hit
  different numbers of ungraded items, per this story's own plan above),
  it's rendered as a percentage instead (`80%`), not `x / y`. Per-connection
  rows still show `totalScore / maxScore` as drafted; a connection with
  `maxScore: 0` shows "needs manual grading" in place of a score, and one
  with a partial ungraded item shows its score plus a
  "(some items need manual grading)" note — neither was disambiguated in
  the wireframe.
* `@longsightgroup/qti3-core` was already added to `server/package.json`
  by QUIZ-TAKE-RENDER-001 (see that story's implementation notes and
  ADR-0011) — this story adds no new dependency, only the scoring/results
  code that uses it.
