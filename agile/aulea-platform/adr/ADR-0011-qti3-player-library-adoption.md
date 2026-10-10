# ADR-0011: Adopt `@longsightgroup/qti3-*` as the QTI 3.0 player library

## Status
Accepted — sprint planning, 2026-09-17

## Context
ADR-0007 cut over quiz upload/storage to QTI 3.0 but explicitly deferred "which QTI 3.0
player library (if any) to adopt" to a future quiz-delivery story. `QUIZ-TAKE-RENDER-001`
(this sprint) is that story: it needs to render `qti-assessment-item`/`qti-assessment-test`
content in-browser for a student.

Grooming (2026-09-13) identified three candidates:
* `qti3-item-player` (amp-up.io) — Vue 2.6-based, certified conformant, framework mismatch
  with ADR-0001's React stack.
* `qti3` (LongsightGroup) — TypeScript, Web Components + a React adapter, framework-neutral
  core. Best fit on paper, maturity unverified at grooming time.
* `@ae-studio/qti-renderer` — vanilla-DOM, no scoring/response-processing at all.

A spike (2026-09-17, `aulea-platform/spikes/qti3-render/`, findings in that folder's
`FINDINGS.md`) tried the LongsightGroup option against this repo's own QTI fixtures before
committing. Only this candidate was spiked; the other two remain unverified.

## Decision
Adopt the LongsightGroup QTI 3 package family:

* `@longsightgroup/qti3-core` (parsing, response capture, scoring — framework-neutral, no
  runtime deps)
* `@longsightgroup/qti3-player` (the `<qti-assessment-item-player>` Web Component)
* `@longsightgroup/qti3-player-react` (React wrapper; peer deps `react >=18.2 <20`, in range
  with ADR-0001's React 18.3.1)

The spike verified rendering/scoring at `0.10.5`; `npm view` at sprint-planning time
(2026-09-17) shows `0.10.6` already published and pinned by both `qti3-player-react`'s and
`qti3-player`'s own dependency declarations. On a pre-1.0 package that's a real gap between
what was verified and what a fresh `npm install` would fetch — `QUIZ-TAKE-RENDER-001` pins
the installed version to exactly `0.10.5` (no `^`/`~` range) rather than silently picking up
`0.10.6` unverified; bumping past `0.10.5` is left as a deliberate, separate decision.

Naming correction from grooming: no npm package is literally named `qti3` — it is these
three scoped packages, all from the same GitHub project, version-pinned together (spiked at
`0.10.5`).

Basis for the decision (see `spikes/qti3-render/FINDINGS.md` for full detail):
* Correct single-select and multi-select `qti-choice-interaction` rendering, verified in
  real Chromium (not jsdom) against this repo's actual fixtures.
* Correct response-capture shape (`serialize()`'s `responses.RESPONSE`) — usable as-is
  against the `quiz_session_connections` per-connection model this story extends.
* Correct scoring both client-side (`scoreAttempt()`, preview only) and, more importantly,
  server-side via `qti3-core` alone (`createItemSession`/`session.score()`) — no browser
  needed, no network dependency (verified by inspecting the installed package directly; no
  `fetch(` call exists anywhere in `qti3-core`'s dist).
* This directly informs `QUIZ-AUTO-EVAL-001` (see that story) — server-side scoring for
  `qti-choice-interaction` does not need hand-written logic against `qti-correct-response`.

Residual, accepted risk: pre-1.0 (`0.x`, API can break between minors), single maintainer,
low weekly downloads (174–265 at spike time). Not a functional gap found in the spike — an
adoption-maturity risk, same one already named at grooming. Not re-litigated by spiking the
other two candidates first; if this risk materializes (an upstream break, abandonment), the
alternatives remain on record above as a documented fallback path.

## Consequences
* `client/package.json` gains `@longsightgroup/qti3-player-react` as a runtime dependency
  (verified via `npm view`: it declares `@longsightgroup/qti3-player` as its own direct
  dependency, which in turn depends on `@longsightgroup/qti3-core` — both pulled in
  transitively, not installed separately; `react`/`react-dom` are peer deps only, already
  satisfied by ADR-0001's React 18.3.1).
* `server/package.json` gains `@longsightgroup/qti3-core` as a direct runtime dependency —
  the server has no reason to install the player/React packages, so this one is not
  transitive here. Originally scoped to `QUIZ-AUTO-EVAL-001`'s server-side scoring
  (§Basis above); development (2026-09-17) found `QUIZ-TAKE-RENDER-001` needs it too —
  its `GET .../items` endpoint computes each item's `registryStatus` server-side (so an
  anonymous client can't fake which items are gradable), which is the same `qti3-core`
  call AUTO-EVAL's scoring already depended on. The dependency addition itself was
  already decided here; only which story's commit adds it to `package.json` moved.
* **Styling boundary with ADR-0006**: `<qti-assessment-item-player>` is a real Custom
  Element with shadow DOM. shadcn/ui (Radix + Tailwind, ADR-0006) cannot reach inside it —
  the rendered question/choices come from the web component's own internal markup/styles,
  unstyled by this app (confirmed in the spike's screenshots: default browser-level
  radio/checkbox chrome, no app theming). `QuizSessionTakePage`'s own chrome (question
  counter, Next/Submit buttons, confirmation screen — see wireframes on
  `story_quiz_take_render.md`) is built with shadcn/ui as normal; the item content itself is
  not, and is out of this app's styling control until/unless the library exposes CSS custom
  properties or slots for that (not evaluated in the spike).
* The player renders one item at a time by design; multi-item Next/Submit sequencing across
  a `qti-assessment-test` is hand-written host code regardless of library choice (~75 lines
  in the spike) — not a qti3-specific cost.
* `qti3-core` also exports `parseQtiPackage(bytes)`, parsing a whole zip package directly
  from a Buffer. Not adopted by this ADR (out of scope — this story only needs one item's
  XML at a time, per ADR-0010's existing server-side item-ref resolution). Flagged as a
  future candidate to simplify or validate `server/src/qti/validateQti3.ts`, for whoever
  picks that up.
* `qti-assessment-item-player`'s shadow-DOM/Custom-Element nature means its rendering
  behavior is verified only in a real browser (Playwright/Chromium), not vitest/jsdom (spike
  finding, unconfirmed for jsdom either way). `client/src/QuizSessionTakePage.test.tsx`
  moves from vitest/jsdom to Playwright e2e as part of `QUIZ-TAKE-RENDER-001` — see that
  story's technical plan.
* This closes ADR-0007's open question for `qti-choice-interaction` content. It does not
  commit to qti3 for any other QTI 3.0 interaction type — `QUIZ-TAKE-RENDER-001` stays
  scoped to choice interactions only, per its own DoD.
