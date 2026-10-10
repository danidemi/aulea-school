ID: QUIZ-CLASS-REVIEW-001

Status: DONE — accepted at sprint review 2026-09-21

Priority: High

Effort: 5

As:
a `trainer`

I want to:
open a per-question breakdown of a stopped quiz session, showing how the whole class answered
each question, with the correct answer marked

So that:
I can walk through the results live with the class, spot which questions show poor understanding,
and address that knowledge gap on the spot

Definition of Done:
* extends the existing Quiz Session Monitor page (`QuizSessionMonitorPage.tsx`) with a new block,
  shown only once the session is `stopped` — same gating pattern as the existing Block #3
  (Results, from QUIZ-AUTO-EVAL-001), placed after it
* for every question in the quiz, the block shows the distribution of answers the class gave:
  * `qti-choice-interaction` items: count of students who picked each offered option
  * any other item type: answers grouped by exact matching raw response text, each distinct
    group shown with its count (best-effort — no semantic grouping of near-identical answers)
* the option/answer matching the item's QTI-declared correct response (`qti-correct-response`,
  read directly from the item XML) is visually distinguished from the rest, for every item type
  where a correct response is declared — independent of whether that item type is currently
  auto-graded (QUIZ-AUTO-EVAL-001's grading scope does not gate this)
* counts are anonymized — no student identity is shown or retrievable from this view for any
  question or answer
* a student who never answered a given question (e.g. quiz abandoned partway) is counted
  separately as "no answer" for that question, not silently omitted from the total
* verified automatically: unit tests for the distribution computation covering a
  `qti-choice-interaction` item, a non-choice item with duplicate and unique free-text answers,
  and an item with at least one student who didn't answer; component tests for the block's
  hidden-until-stopped gating and its rendering of a multi-question breakdown, extending
  `QuizSessionMonitorPage.test.tsx`
* verified manually: a screenshot of the new block after a session is stopped, per the
  screenshot-on-GUI-done convention in `do_and_donts.md`

Dependencies:
QUIZ-TAKE-RENDER-001 and QUIZ-AUTO-EVAL-001 (needs the `quiz_session_answers` rows and the
stopped-session Monitor page they built) — both already `DONE`, no open dependency.

Notes (refinement, 2026-09-21):
* Deliberately reuses the Quiz Session Monitor page rather than a new screen, and the `stopped`
  gating Block #3 already established — keeps this consistent with the page's existing structure
  instead of introducing a second place to look for session results.
* Anonymized-only was an explicit choice: this view is for discussing results with the whole
  class, not singling out individual students. Per-student drill-down was considered and
  deliberately deferred — worth its own future story if a trainer asks for it.
* Correct-answer highlighting reads `qti-correct-response` directly from the item XML rather than
  depending on QUIZ-AUTO-EVAL-001's scoring pipeline, so it isn't limited to auto-gradable item
  types.
* Live (pre-stop) availability was considered and deliberately deferred in favor of matching
  Block #3's simpler stopped-only gating — no new polling behavior needed for this story.

Open questions:
none blocking — ready for sprint planning to size the technical approach in detail.

Technical plan (sprint planning, 2026-09-21):
* No new ADR — reuses existing infrastructure end to end (`@longsightgroup/qti3-core` for XML
  parsing per ADR-0011, the existing per-session `quiz_session_answers` table, and the Quiz
  Session Monitor page's existing `stopped`-only rendering gate from QUIZ-AUTO-EVAL-001).
* Confirmed in `server/src/qti/resolveQtiItems.ts`/`scoreAnswer.ts` and
  `@longsightgroup/qti3-core`'s `types.d.ts`: `parsed.document.item` exposes both
  `responseDeclarations` (with `correctResponse`, generic to any interaction type) and, for
  choice-type interactions, `interactions[0].choices` (`identifier` + display `text`) — so
  correct-answer highlighting and choice-label lookup don't depend on
  `resolveQtiItems.ts`'s narrower `supported` (choice-only) flag at all.
* New endpoint `GET /api/quiz-sessions/:sessionId/answer-breakdown` (trainer-side, tenant-scoped,
  same `409` pattern as `.../results` while not yet `stopped`). Mirrors `.../results`'s own
  shape: reuses `sessions.findByIdForTenant`, `connections.listForSession` (filtered to
  `submittedAt !== null`, same "only real attempts count" rule QUIZ-CONNECTION-INTEGRITY-001
  established for `.../results`), and `answers.listForConnection` per connection — but groups by
  `itemIdentifier` across connections instead of summing per connection.
* Per item, resolve its XML once (via the same `quizzes.getFilesByQuizId` +
  `resolveQuizItems`/`toResolvedItem` path `.../results` and `.../items` already use — one parse
  per distinct item, not per answer row) to read `choices` (if any) and `correctResponse`.
  For a `qti-choice-interaction` item: bucket every row's stored `responses[responseIdentifier]`
  by matching choice `identifier`, label each bucket with the choice's `text`, mark the bucket
  matching `correctResponse` (`isCorrect: true`). For any other item type: bucket rows by their
  raw `responses[responseIdentifier]` value stringified as-is (no normalization — exact match
  only, per this story's "best-effort" DoD scope), still marking the bucket matching
  `correctResponse` when one is declared. A connection with no row at all for that
  `itemIdentifier` (abandoned partway) goes into a dedicated `"no answer"` bucket, counted but
  never merged into a real answer bucket.
* Response shape: `{ items: [{ itemIdentifier, prompt, buckets: [{ label, count, isCorrect
  }], noAnswerCount }] }`. Item order follows `resolveQuizItems`' own ordering (same as every
  other per-item list in this codebase), not alphabetical/arbitrary.
* Client: new `Block4AnswerBreakdown` section in `QuizSessionMonitorPage.tsx`, fetched once via
  the same `status === 'stopped'`-gated `useEffect` pattern Block #3 already uses (`data-testid
  ="block-4-answer-breakdown"`), rendered after Block #3. Each item renders as its own card: a
  bar/row per bucket showing `label` and `count`, the `isCorrect` bucket visually marked (e.g.
  a checkmark + accent color, consistent with the design system used elsewhere on this page),
  and a trailing "No answer: N" row when `noAnswerCount > 0`.
* Testing: server-side unit tests for the bucketing function directly (not just through the
  route) — a choice item with a clean 3-way split, a non-choice item with duplicate and unique
  raw-text answers, and a connection missing a row for one item (no-answer bucket) — plus a route
  test for the `409` pre-stop gate. Client: extend `QuizSessionMonitorPage.test.tsx` for
  Block #4's hidden-until-stopped gating and a multi-item, multi-bucket render.
* Sequenced independently within the sprint — no other PBI selected this sprint to conflict with.

Verification (development):
* New pure computation `server/src/qti/answerBreakdown.ts` (`computeAnswerBreakdown`), parsing
  the item XML once per item — buckets a `qti-choice-interaction` item by every offered option
  (including zero-count ones), buckets any other item type by exact raw-text match, marks the
  bucket matching `qti-correct-response` for any item type, and separates "no row for this item"
  into `noAnswerCount` rather than a bucket.
* New endpoint `GET /api/quiz-sessions/:sessionId/answer-breakdown`
  (`server/src/routes/quizSessions.ts`), mirroring `.../results`'s tenant scoping, `409`
  pre-stop gate, and "only real (submitted) attempts count" connection filter.
* Client: new `Block #4` (`data-testid="block-4-answer-breakdown"`) in
  `QuizSessionMonitorPage.tsx`, fetched once on the same `stopped` transition as Block #3, one
  card per item with a bar per answer bucket, a checkmark on the correct one, and a trailing
  "No answer" row when applicable.
* Automated: unit tests for `computeAnswerBreakdown` (choice-item full distribution incl. correct
  marking, non-choice duplicate/unique text grouping, no-answer separation, prompt pass-through)
  — `server/src/qti/answerBreakdown.test.ts`. Route tests for the `409` gate, a full
  three-connection breakdown (including a submitted-but-unanswered connection), and the
  submitted-only connection filter — `server/src/routes/quizSessions.test.ts`. Component tests
  for the hidden-until-stopped gating and a multi-item render — `QuizSessionMonitorPage.test.tsx`.
  Full suites pass: server 175/175, client 88/88 (one pre-existing unrelated unhandled-rejection
  warning in `CourseDetailPage.test.tsx`, not from this change). `tsc -b` clean in both packages.
* Manual: no Docker/Postgres available in this environment, so the real backend couldn't be
  started for a full click-through. Instead, verified in a real browser (Playwright + Chromium)
  against the actual Vite dev server with the three relevant API calls mocked at the network
  layer — a genuine rendered/CSS-applied check, not jsdom. Screenshot confirms Block #4: per-item
  cards, correct-answer checkmark + accent styling, proportional bars, and the "No answer" row.
* Rework (2026-09-21, human review): the question text wasn't showing in Block #4. Root cause:
  `computeAnswerBreakdown` read `item.prompt` (the item-body-level prompt), but real authored
  items (per `quiz-author` and the QTI sample fixtures) always nest `<qti-prompt>` inside
  the interaction element, so `item.interactions[0].prompt` is the actual source — `item.prompt`
  was consistently `undefined` for every real item. Fixed in `answerBreakdown.ts` to prefer
  `interaction.prompt` (falling back to `item.prompt` for the rare item-body-level case). Replaced
  the misleading prompt unit test (which had injected `<qti-prompt>` directly under
  `<qti-item-body>`, not matching real authoring) with one nesting it inside the interaction, per
  the actual `qti3-core` shape. Re-verified with a fresh Playwright screenshot showing both
  questions' text rendered above their bucket lists. Full suites re-run clean: server 175/175,
  client 88/88, `tsc -b` clean both packages.
* Known limitation (pre-existing, out of scope here): `POST .../answers` already stores
  `responses: null` for any non-`qti-choice-interaction` item (QUIZ-TAKE-RENDER-001's
  "ignore client-sent responses for unsupported items" choice), so in the live app today a
  non-choice item's answer breakdown will always show as all "no answer" — the raw-text
  grouping is implemented and unit-tested per the DoD, but has no real data feeding it yet
  without a future story to persist unsupported-item raw text.
