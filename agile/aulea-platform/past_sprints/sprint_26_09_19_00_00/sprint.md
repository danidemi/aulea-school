# Sprint 2026-09-17

## Stories
1. `QUIZ-TAKE-RENDER-001` — real quiz-taking experience (render + record answers)
2. `QUIZ-AUTO-EVAL-001` — automatic scoring of recorded answers

Sequenced in that order — AUTO-EVAL depends on TAKE-RENDER's `quiz_session_answers` data.
Both were the only two items in the backlog; taken together per CLAUDE.md's "smallest
possible subset" guidance since they're directly dependent and there's no other backlog work
to fill the gap if only one were taken.

## Sprint-planning ADR
`ADR-0011-qti3-player-library-adoption.md` — adopts `@longsightgroup/qti3-core` +
`qti3-player` + `qti3-player-react` for both stories (rendering in TAKE-RENDER, scoring in
AUTO-EVAL), based on `spikes/qti3-render/` (2026-09-17). Closes ADR-0007's deferred "which
QTI 3.0 player library" question for `qti-choice-interaction` content.

## Cross-cutting items (flagged once here, per sprint_26_08_23_12_32's do/don't, not
duplicated inside each story)

* **New runtime dependencies**: `client/package.json` gains
  `@longsightgroup/qti3-player-react` (pulls in `qti3-player`/`qti3-core` transitively as its
  own direct deps — not installed separately, `react`/`react-dom` are peer deps only);
  `server/package.json` gains `@longsightgroup/qti3-core` directly. All pre-1.0 (`0.x`) —
  see ADR-0011's accepted risk.
* **jsdom → Playwright e2e for the rendering path**: `qti-assessment-item-player` is a real
  Custom Element (shadow DOM), verified only in real Chromium by the spike, not jsdom.
  `client/src/QuizSessionTakePage.test.tsx`'s rendering-path tests move to Playwright e2e as
  part of TAKE-RENDER — decided now, not rediscovered mid-sprint (per sprint_26_09_16's
  do/don't).
* **E2E specs need rewriting, not just extending**: both `client/e2e/quiz-session-take.spec.ts`
  and `client/e2e/quiz-session-monitor.spec.ts` currently drive today's stub join/submit
  flow. TAKE-RENDER replaces that stub with a real multi-item quiz — both specs are rewritten
  to drive a real choice-interaction quiz end to end, as explicit sprint scope (blast-radius
  check, sprint_26_09_16's do/don't), not left for a developer to notice when they start
  failing.
* **"Answered %" meaning shift**: `QUIZ-SESSION-LIVE-STATUS-001` (DONE) defined Block #2's
  "answered" percentage as "clicked the stub submit button." Once TAKE-RENDER ships, the same
  DoD wording and the same displayed number come to mean "completed the entire real quiz."
  No code change needed in Block #2 itself (reopen/accumulation logic is unaffected) — noted
  here so this isn't mistaken for a regression at sprint review.
* **New fixture for the untested "other interaction type" path**: neither story's
  "unsupported type" (TAKE-RENDER) / "needs manual grading" (AUTO-EVAL) branch had a non-
  `qti-choice-interaction` fixture to test against. Added
  `server/test-fixtures/qti-samples/sample-accept-text-entry-unsupported.xml`
  (`qti-text-entry-interaction`) at sprint planning for exactly this.
* **Styling boundary**: the qti3 player's shadow DOM is outside shadcn/ui's (ADR-0006) reach
  — only each screen's own chrome (buttons, counters, messages) gets shadcn/ui styling; the
  rendered question/choices come unstyled from the web component itself. See ADR-0011.

## Wireframes
Drafted as ASCII layouts directly in each story (no hand-drawn originals this sprint,
unlike `assets/quiz-session-monitor/*.png`) and approved by the human at sprint planning,
2026-09-17, per sprint_26_08_20's do/don't (draw before implementing a large front-end
surface, during planning not after a first attempt):
* `active_sprint/story_quiz_take_render.md` — question screen, not-started/stopped/
  unsupported-type states, confirmation screen (top half).
* `active_sprint/story_quiz_auto_eval.md` — Monitor page Block #3, confirmation screen
  (score line, bottom half — same screen as TAKE-RENDER's, not a separate one).
