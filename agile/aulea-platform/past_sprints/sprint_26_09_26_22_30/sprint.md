# Sprint plan — started 2026-09-22

## Scope

All five READY backlog PBIs, plus one new tech PBI split out during planning (effort 19 total):

1. **BUG-ANSWER-BREAKDOWN-MULTISELECT** (Effort 2) — multi-select responses silently dropped from
   the Answer Breakdown.
2. **BUG-ANSWER-BREAKDOWN-BAR-MISALIGN** (Effort 1) — correct-option checkmark misaligns bars.
   Same component/block as #1 — sequenced right after it, one screenshot verifies both.
3. **QUIZ-SESSION-PER-STUDENT-DELIVERY-001** (Effort 5, new tech PBI) — shared plumbing for #4/#5:
   persisted per-connection item/choice order, connection-scoped items endpoint, XML
   parse/reorder/serialize (`@xmldom/xmldom`, new dependency — see ADR-0013).
4. **QUIZ-RANDOM-QUESTION-ORDER-001** (Effort 5) — force-shuffle-questions toggle.
5. **QUIZ-RANDOM-ANSWER-ORDER-001** (Effort 5) — force-shuffle-answers toggle.
6. **TESTDATA-001** (Effort 3) — HTTP-API-driven test data seeding script, no dependency on the
   others; built to also supply the fixture data #1/#2 verify against.

`BUG-QUIZ-EMPTY-ANSWER-MANUAL-GRADING` stays `DISCARDED` in `backlog/` — not picked, not moved.

## Technical decisions (new ADR this sprint)

* **ADR-0013** — per-student question/answer shuffling: semantics and XML serialization.
  * Verified live: `@longsightgroup/qti3-player*`/`qti3-core` (`0.10.5`) implement no `shuffle`
    attribute at all — items authored `shuffle="true"` (the `quiz-author` default)
    render in fixed order today, for every student.
  * PO-decided semantics: the new session settings are a **force-shuffle override**, not a plain
    on/off. Off means "honor the item/section's own authored `shuffle` attribute" — a real
    behavior change (existing `shuffle="true"` content starts actually shuffling), not just an
    opt-in feature. On forces shuffling regardless of the attribute.
  * New dependency: `@xmldom/xmldom` (pure JS, Node ≥14.6, no native build step) for parse →
    reorder → serialize of a `qti-choice-interaction`'s choices.
  * Attribution (scoring/breakdown/monitoring) needs no code change — both
    `computeAnswerBreakdown` and `scoreChoiceAnswer` key off identifiers, never position.

## Cross-cutting gap, flagged now rather than discovered at review

**Behavior change for already-uploaded quizzes.** Once `QUIZ-SESSION-PER-STUDENT-DELIVERY-001`
and either random-order story ship, any quiz already authored with `shuffle="true"` (the plugin's
own default, used by essentially every real authored item/section) starts shuffling per student
the moment a trainer starts a new session for it — with no action from the trainer. This is
PO-approved (sprint planning, 2026-09-22), not an oversight, but it means existing quizzes'
delivery behavior visibly changes without a corresponding UI change trainers would notice ahead of
time. Worth a one-line callout at sprint review and, if the PO wants it, in release notes.

**No test fixture exercises `shuffle="true"` today.** Every fixture in this repo uses
`shuffle="false"` and none use `qti-ordering` — `QUIZ-SESSION-PER-STUDENT-DELIVERY-001`'s DoD adds
a new fixture package so the "off = follow authored XML" path has real test data, not just the
forced-on path.

## Per-story technical plan

See each PBI's own "Technical plan" section:
* `backlog/task_quiz_session_per_student_delivery.md` (moves to `active_sprint/` — the tech PBI)
* `backlog/story_per_student_random_question_order.md`
* `backlog/story_per_student_random_answer_order.md`
* `backlog/bug_answer_breakdown_ignores_multi_select_responses.md`
* `backlog/bug_answer_breakdown_bar_misaligned_for_correct_option.md`
* `backlog/story_test_data_seeding.md`

## Suggested build order

1. BUG-ANSWER-BREAKDOWN-MULTISELECT
2. BUG-ANSWER-BREAKDOWN-BAR-MISALIGN (same screenshot as #1)
3. TESTDATA-001 (independent; also supplies fixture data useful for #1/#2's screenshot)
4. QUIZ-SESSION-PER-STUDENT-DELIVERY-001
5. QUIZ-RANDOM-QUESTION-ORDER-001 / QUIZ-RANDOM-ANSWER-ORDER-001 (after #4)
