ID: BUG-ANSWER-BREAKDOWN-MULTISELECT

Status: DONE

Priority: High

Effort: 2

Steps To Reproduce:
1. As a student, take a quiz containing a `qti-choice-interaction` item with `max-choices="0"` (or
   any multi-select item, `cardinality="multiple"`), selecting all correct options.
2. Submit the quiz — the student sees the correct score (e.g. "Your score: 2 / 2").
3. As a trainer, stop the quiz session and open the Answer Breakdown block
   (QUIZ-CLASS-REVIEW-001) on the Quiz Session Monitor page.

Expected result:
The multi-select question's answer breakdown shows the counts for each option the class actually
picked (e.g. "2": 1, "7": 1), with the correct options marked, matching what was actually
submitted and scored.

Actual result:
Every option shows a count of 0, even though the student answered correctly and was scored 2/2.
The answer is not counted as "no answer" either — it's silently dropped from the totals.

Root cause (found during QUIZ-CLASS-REVIEW-001 rework, 2026-09-21):
`computeAnswerBreakdown` (`server/src/qti/answerBreakdown.ts`) buckets `qti-choice-interaction`
responses with `if (typeof value !== 'string') continue`, assuming every stored response is a
single identifier string. But a multi-select item stores its response as an array of identifiers
(`{ RESPONSE: ["choice_a", "choice_c"] }`, confirmed against `scoreChoiceAnswer`'s own handling in
`server/src/qti/scoreAnswer.ts`), so every multi-select answer is skipped by that `continue` and
never counted in any bucket.

Technical plan (sprint planning, 2026-09-22):
* `computeAnswerBreakdown` (`server/src/qti/answerBreakdown.ts`): for a `choice` interaction,
  iterate each response value — if it's a string, count it as today; if it's an array (multi-select),
  count each identifier in it as a pick of its own bucket. An empty array (`{ RESPONSE: [] }` — a
  real "Next with nothing selected" shape from `qti3-player`'s `serialize()`, confirmed against
  `client/src/QuizSessionTakePage.tsx`'s capture call) counts as `noAnswerCount`, same as
  `null`/`undefined`, not silently dropped.
* Bar denominator (raised at sprint planning — the existing DoD wording didn't cover multi-select):
  the percentage denominator is the number of submitted connections that have a row for this item
  (`responsesPerConnection.length`, i.e. every real attempt, answered or not), not the sum of picks.
  Today's single-select `total` already equals this for valid data, so single-select bars are
  unchanged; for multi-select, an option every respondent picked now correctly shows 100%, not a
  count that's diluted by how many options each respondent chose. Returned from the server as a new
  `respondentCount` field per item (`GET .../answer-breakdown`), read by
  `client/src/QuizSessionMonitorPage.tsx` in place of its own locally-summed `total`.
* Unit test built from the real shape `qti3-player-react`'s `serialize()` produces for a
  multi-select choice interaction (`{ RESPONSE: ["choice_a", "choice_c"] }`, confirmed against
  `server/src/qti/scoreAnswer.ts`'s own handling), not an invented fixture, per the standing DON'T
  from `sprint_26_09_21_19_34`.
* Sequenced first in this sprint, ahead of `BUG-ANSWER-BREAKDOWN-BAR-MISALIGN` (same block, one
  screenshot verifies both) per `do_and_donts.md`'s standing note on stories that share a
  component.

Definition of Done:
* `computeAnswerBreakdown` counts each identifier in a multi-select (`cardinality="multiple"`)
  response array as a pick of its corresponding option bucket
* an empty multi-select response array (`{ RESPONSE: [] }`) counts as "No answer", not a silent
  drop
* a multi-select item's Answer Breakdown shows real per-option counts and percentages matching
  what students actually submitted (percentage denominator = respondents who have a row for this
  item, not total picks), instead of all-zero
* single-select (`cardinality="single"`) breakdown behavior — counts and percentages — is
  unchanged
* verified with a unit test built from a real stored multi-select response shape (as produced by
  the actual quiz-taking flow, not an invented fixture, per the standing DON'T from
  `sprint_26_09_21_19_34`), plus a real-browser screenshot of the corrected breakdown
