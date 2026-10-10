Sprint review — 2026-09-21

## PBIs completed

- **QUIZ-CLASS-REVIEW-001** (story, effort 5) — trainer-facing per-question answer breakdown on
  the stopped Quiz Session Monitor page. `Status: DONE`, accepted at sprint review.
  - Built: `computeAnswerBreakdown` (pure distribution computation), the
    `GET /api/quiz-sessions/:sessionId/answer-breakdown` endpoint, and a new Block #4 on
    `QuizSessionMonitorPage.tsx`.
  - Verified: 175/175 server tests, 88/88 client tests, clean `tsc -b` on both packages, and a
    real-browser (Playwright/Chromium) screenshot since Docker/Postgres weren't available to run
    the full stack in this environment.
  - Rework during review: the question text wasn't rendering. Root cause — `computeAnswerBreakdown`
    read `item.prompt` (item-body-level), but real authored items always nest `<qti-prompt>` inside
    the interaction element, so it was reading the wrong field. Fixed to read
    `interaction.prompt` first; misleading unit test corrected to match real authoring shape;
    re-verified with a fresh screenshot.
  - Human sign-off: confirmed OK once the question-text fix landed.

## Decisions/observations during the sprint

- No Docker/Postgres available in this sandbox — manual GUI verification for stories touching the
  UI had to substitute a real Chromium (Playwright) render against the Vite dev server with API
  calls mocked at the network layer, rather than a full end-to-end run against the real backend.
  Documented as a limitation in the PBI rather than skipped.
- Found and documented (not fixed — out of scope for this PBI) a pre-existing gap: `POST
  .../answers` discards raw response text for any non-`qti-choice-interaction` item, so this
  story's non-choice grouping-by-text feature has no real data to display yet in the live app.

## New bug found during review (not fixed this sprint)

- **BUG-ANSWER-BREAKDOWN-MULTISELECT** (filed to `backlog/`): a multi-select
  (`qti-choice-interaction`, `cardinality="multiple"`) item's answer breakdown shows every option
  at count 0 even when students answered correctly, because `computeAnswerBreakdown`'s bucketing
  only handles single-string responses and silently skips array-valued ones. Found by the human
  while reviewing this sprint's own feature; root-caused during this session; left in the backlog
  for future sprint planning rather than fixed ad hoc.
