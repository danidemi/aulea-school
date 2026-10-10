ID: BUG-ANSWER-BREAKDOWN-BAR-MISALIGN

Status: DONE

Priority: Low

Effort: 1

Steps To Reproduce:
1. As a trainer, stop a quiz session and open the Answer Breakdown block
   (QUIZ-CLASS-REVIEW-001) on the Quiz Session Monitor page, for an item that has more than one
   answer option.
2. Look at the row for the correct option(s) vs. the rows for the incorrect options.
   Reproduces both for single-answer items (one correct option, e.g. "Berlin / Paris / Rome") and
   for multi-select items with more than one correct option (e.g. "Which of the following are
   prime? 2 / 4 / 7 / 9", where both "2" and "7" are correct).

Expected result:
All option labels and bars start at the same horizontal position, regardless of whether the
option is correct or not (see attached images: the red line marks where every bar should start;
in the multi-select example, "2", "4", "7", "9" should all left-align, but "2" and "7" are pushed
right of "4" and "9").

Actual result:
The label and bar for each correct option are shifted further to the right than the rows for
incorrect options, because a checkmark icon is rendered inline before the option label only for
correct rows, and that icon isn't given reserved space — it pushes the label and its bar to the
right instead of sitting in its own fixed-width column.

Root cause (found by inspection, 2026-09-21; path corrected at sprint planning 2026-09-22 — the
file is a client component, not under `server/src/`):
`client/src/QuizSessionMonitorPage.tsx` (around line 366-378) renders, per bucket:
```
{bucket.isCorrect && <Check className="size-4 shrink-0 text-brass" ... />}
<span className="w-32 shrink-0 ...">{bucket.label}</span>
<div className="h-2 flex-1 ...">...bar...</div>
```
The `Check` icon is an optional flex sibling with no reserved width, so rows with `bucket.isCorrect`
get an extra ~20px pushed onto the label + bar that rows without it don't have.

Technical plan (sprint planning, 2026-09-22):
* Wrap the `Check` icon in a fixed-width column (e.g. a `w-4 shrink-0` container rendered for
  every row, icon inside it only when `bucket.isCorrect`) instead of rendering `Check` as an
  optional flex sibling — same pattern already used for the label's own `w-32 shrink-0`.
* Sequenced after `BUG-ANSWER-BREAKDOWN-MULTISELECT` in this sprint (same block, same component,
  same screenshot) per `do_and_donts.md`'s standing note on stories that share a component.

Definition of Done:
* every option row's label and bar start at the same horizontal position, whether or not that
  option is marked correct, for both single-answer and multi-select items
* the correct-option checkmark renders in its own fixed-width column instead of pushing sibling
  elements
* verified with a real-browser (Playwright/Chromium) screenshot of the Answer Breakdown block for
  a multi-select item with at least one correct and one incorrect option (the same screenshot that
  verifies `BUG-ANSWER-BREAKDOWN-MULTISELECT`), per the standing DO from `sprint_26_09_21_19_34`
