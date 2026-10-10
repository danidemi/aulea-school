# Sprint Review — sprint_26_09_19

Both stories accepted DONE by the human, 2026-09-19.

## Delivered
* **QUIZ-TAKE-RENDER-001** — real quiz-taking experience via `@longsightgroup/qti3-player`
  (ADR-0011): question-by-question rendering, per-item answer recording
  (`quiz_session_answers`), Next/Submit sequencing, session-status gating, unsupported-item-type
  placeholder path.
* **QUIZ-AUTO-EVAL-001** — automatic scoring of `qti-choice-interaction` answers via
  `@longsightgroup/qti3-core`, student-visible score on the confirmation screen, trainer-side
  Monitor page Block #3 (per-connection scores, class average, "needs manual grading" for
  ungraded items).

## Post-review bug fixes (found by the human via manual UAT against the live built app, not by
the automated suite — both on `QUIZ-TAKE-RENDER-001` code)
* Question-taking card was fixed at `max-w-sm`, clipping the qti3 player's actual content —
  widened to `max-w-3xl` only while a question is showing.
* Question/answer text was invisible under OS/browser dark-mode preference:
  `qti-assessment-item-player` sets an inline `color-scheme: "light dark"` on itself, which
  resolved CSS system colors to white-on-white against this app's light-only background. Fixed
  with a `!important` override pinning `color-scheme: light` on that element specifically (a
  plain `:root` rule alone can't beat the element's own inline style).
* Both fixes verified against the live built app — the width fix by the human directly; the
  color-scheme fix via before/after Playwright screenshots taken under emulated dark-mode
  preference, since the bug doesn't reproduce under default light-preference settings.
* Corrects a standing assumption in `QUIZ-TAKE-RENDER-001`'s plan and ADR-0011: the
  `qti-assessment-item-player` custom element renders into **light DOM, not shadow DOM**
  (confirmed by inspecting the library's source — no `attachShadow` call anywhere in it). The
  "styling boundary" reasoning in both documents (shadcn/ui can't reach the player's internals
  because of shadow DOM) reached the right practical conclusion by the wrong mechanism; worth
  fixing in ADR-0011 if it's revisited.

## Observations
* Neither bug was caught by the automated suite (`tsc -b`, vitest, the e2e specs) — both are
  purely visual/CSS defects that only show up when actually looking at rendered pixels (one
  needs a specific viewport-relative width judgment, the other needs a specific OS/browser color
  scheme preference). This sprint's testing plan explicitly moved qti3 rendering checks to
  Playwright e2e specs, but those specs assert on DOM/text content, not on layout or visible
  color — a passing e2e run gave no signal either bug existed.
* Confirmed live-server testing practice (established in `sprint_26_08_22_15_56`'s do/don't)
  extended naturally to catching a bug class unit/e2e tests structurally can't see: both fixes
  were verified by screenshotting the actual built app, the color-scheme one under Playwright's
  `colorScheme: 'dark'` emulation specifically to reproduce a preference-dependent bug.

See `references/do_and_donts.md`'s `sprint_26_09_19_00_00` entry for what carries forward.
