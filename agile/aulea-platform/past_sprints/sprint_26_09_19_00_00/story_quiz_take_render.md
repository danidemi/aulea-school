ID: QUIZ-TAKE-RENDER-001

Status: DONE

Priority: High — replaces the QUIZ-SESSION-LIVE-STATUS-001 placeholder page with the real
quiz-taking experience it was explicitly built to be a stand-in for.

Effort: 8 (grooming, 2026-09-13 — sized on top of an adopted player library; would be larger
if the sprint-planning ADR instead chooses to hand-build a renderer)

Depends on: QUIZ-PACKAGE-STORAGE-001 (needs a multi-item test's item files to be retrievable
server-side)

As:
a `student` (anonymous, per current session model — no login exists for students yet)

I want to:
open the QR/URL link for a running quiz session and actually see and answer the quiz's
questions, one at a time through the whole test, with my answers recorded

So that:
I can actually take the quiz instead of landing on a placeholder page with a single stub
Submit button

Definition of Done:
* opening the session's take-URL while the session is `running` renders the quiz's actual
  content from its stored QTI package (see QUIZ-PACKAGE-STORAGE-001): each question in the
  `qti-assessment-test`, in order, one at a time, with Next/Submit navigation through all N
  items
  * a session on a standalone single-item quiz (no test wrapper) still works, rendering that
    one item
* in scope for this story: `qti-choice-interaction` only (single-select and multiple-select),
  matching the only interaction type present in real authored content today. Any other QTI
  3.0 interaction type (text-entry, extended-text, match, order, hot-spot, ...) in an
  uploaded item is explicitly out of scope — flagged as a known gap, not silently broken
  (e.g. render a clear "unsupported question type" placeholder for that item rather than
  crashing the page)
* each answer a student gives is recorded against that student's connection for that
  session (extends the existing `quiz_session_connections` per-connection model — no new
  student-identity system; stays anonymous per the 2026-09-13 grooming decision, see note
  below)
* reaching the end and submitting marks the connection `submitted` (extends today's stub
  submit behavior) and shows a confirmation screen
* opening the take-URL before the session has started, or after it has stopped, shows an
  appropriate message instead of quiz content (extends today's placeholder's implicit
  session-status awareness)
* verification: automated where feasible (rendering/recording logic, answer persistence,
  including that an unsupported-interaction-type item writes an `'ungraded'`
  `quiz_session_answers` row rather than nothing at all, using
  `sample-accept-text-entry-unsupported.xml`) plus a manual click-through of a full
  multi-item choice-only quiz, start to submit

Known context (grooming, 2026-09-13):
* ADR-0007's open question — "which QTI 3.0 player library (if any) to adopt" — is now
  confirmed cleared as a *dependency* (real options exist, verified by web search), though
  the actual choice is still deferred to sprint planning with an ADR, not decided here:
  * `qti3-item-player` (amp-up.io, npm) — Vue 2.6-based, full response processing/scoring,
    holds 1EdTech QTI 3 Basic + Advanced Delivery Conformance Certification. Framework
    mismatch with this stack's React (ADR-0001) is the main caveat.
  * `qti3` (LongsightGroup, npm, `longsightgroup` org) — TypeScript, framework-neutral core
    with Web Components + a React adapter, includes response processing/scoring, dependency-
    light. Best framework fit for this stack on paper; maturity/adoption not yet vetted.
  * `@ae-studio/qti-renderer` (agencyenterprise, npm) — framework-agnostic vanilla-DOM
    renderer, no external deps, but explicitly does **not** include scoring/response
    processing (would need to be paired with hand-written logic for QUIZ-AUTO-EVAL-001
    regardless).
  * `qti3` has been spiked against this repo's actual fixtures (2026-09-17) — see
    `piattaforma-corsi/aulea-platform/spikes/qti3-render/FINDINGS.md`. Naming correction:
    no npm package is literally named `qti3` — it's three packages,
    `@longsightgroup/qti3-core` + `qti3-player` + `qti3-player-react`. Confirmed: correct
    single/multi-select `qti-choice-interaction` rendering (verified in real Chromium, not
    jsdom), correct response capture shape, correct scoring both client-side (preview) and
    server-side via `qti3-core` alone (no browser), no network dependency. The multi-item
    Next/Submit sequencing this DoD needs is hand-written host code either way — qti3's
    player renders one item at a time by design, regardless of which candidate is chosen.
    The other two candidates (`qti3-item-player`, `@ae-studio/qti-renderer`) remain
    unspiked.
  * **Decided at sprint planning (2026-09-17): adopted.** See ADR-0011. The other two
    candidates were not spiked before committing — the spike's findings against this repo's
    own fixtures were judged sufficient; they remain a documented fallback if the accepted
    pre-1.0/single-maintainer risk materializes.
* Scope was deliberately narrowed to `qti-choice-interaction` because it's the only
  interaction type present in this repo's QTI fixtures/authored content — broader QTI 3.0
  interaction support is a future PBI if/when authored content needs it.
* Students stay anonymous for this story, per the existing `quiz_session_connections` model.
  The human confirmed a future need for a trainer-configurable "require student
  identification" toggle per session — not built now, noted here for a future PBI.
* Auto-scoring of recorded answers is explicitly NOT part of this story — see
  QUIZ-AUTO-EVAL-001.

Wireframes (ASCII, drafted and approved at sprint planning, 2026-09-17 — no hand-drawn
originals for this story, drafted directly against the DoD and the existing
`QuizSessionMonitorPage` conventions):

* In-progress question (`QuizSessionTakePage`, one item of the sequence):
  ```
  ┌───────────────────────────────────────┐
  │  Question 2 of 5                       │
  │ ─────────────────────────────────────  │
  │                                         │
  │  [ qti3 item render area ]             │
  │   ( question text + choices,           │
  │     radios or checkboxes,              │
  │     rendered by qti3-player )          │
  │                                         │
  │ ─────────────────────────────────────  │
  │                            [ Next → ]  │
  │                   (label: [ Submit ]   │
  │                    on last item)       │
  └───────────────────────────────────────┘
  ```
* Not-yet-started:
  ```
  ┌───────────────────────────────────────┐
  │           This quiz hasn't             │
  │           started yet.                 │
  │      Check back once the trainer       │
  │           starts the session.          │
  └───────────────────────────────────────┘
  ```
* Stopped:
  ```
  ┌───────────────────────────────────────┐
  │        This quiz session has ended.    │
  └───────────────────────────────────────┘
  ```
* Unsupported interaction type (mid-sequence, item skipped rather than crashing):
  ```
  ┌───────────────────────────────────────┐
  │  Question 3 of 5                       │
  │ ─────────────────────────────────────  │
  │  ⚠ This question type isn't            │
  │    supported yet and has been          │
  │    skipped.                            │
  │ ─────────────────────────────────────  │
  │                            [ Next → ]  │
  └───────────────────────────────────────┘
  ```
* Confirmation (final submit — this story ships the top half only; QUIZ-AUTO-EVAL-001 adds
  the score line below it on the same screen, not a separate screen):
  ```
  ┌───────────────────────────────────────┐
  │                                         │
  │           ✓ Quiz submitted!            │
  │                                         │
  │    (QUIZ-AUTO-EVAL-001 adds a score    │
  │     line below this, once it ships)    │
  │                                         │
  └───────────────────────────────────────┘
  ```

Technical plan (sprint planning, 2026-09-17):
* Player library: `@longsightgroup/qti3-player-react`, pinned to exactly `0.10.5` (no
  `^`/`~` — see ADR-0011's version-gap note; it transitively pulls in `qti3-player`/
  `qti3-core` as its own dependencies, not installed separately) per ADR-0011.
  `client/package.json` gains it as a runtime dependency.
* `QuizSessionTakePage.tsx` is rewritten (not extended) to replace today's placeholder:
  * On mount, behavior is unchanged from today for the connection lifecycle (`POST
    .../connections` on load) — this story only changes what renders after joining, not the
    join mechanics themselves.
  * Fetches the session's quiz item XML(s) from the server (per QUIZ-PACKAGE-STORAGE-001 /
    ADR-0010 — the server resolves `qti-assessment-item-ref` hrefs from `quiz_files`; the
    client never parses `test.xml` itself, per the spike's finding in FINDINGS.md §1).
  * A single-item quiz (no test wrapper) and a multi-item test both render through the same
    per-item component — a test is just a sequence of N items, matching the spike's
    `TestSequenceDemo` shape (`spikes/qti3-render/src/App.tsx`).
  * Per item: render via `qti3-player-react`'s wrapper. On `Next`, capture the item's
    `serialize()` response (`responses.RESPONSE`) and `POST` it to a new endpoint (see
    below) before advancing. `navigation-mode` is assumed `linear` (forward-only, Next only,
    no Back) — matches this DoD and the spike's noted assumption; a future `nonlinear` test
    part is not handled.
  * Interaction-type gate: before rendering an item, check its parsed interaction's
    `registryStatus` (per the spike's §2 finding). `"unsupported"` (or `"deprecated"`, this
    story's scope is choice-only) renders the unsupported-type placeholder above and still
    advances via Next — never crashes, never silently drops the item from the sequence
    count. Advancing past an unsupported item still writes a `quiz_session_answers` row for
    it, with `responses: null` (there is no captured response) and `gradingStatus:
    'ungraded'` set directly at write time (not left for QUIZ-AUTO-EVAL-001 to infer from an
    empty response) — this is what makes Block #3's "needs manual grading" cell in
    QUIZ-AUTO-EVAL-001 have a real row to read; without it, an unsupported item would have no
    persisted trace at all despite the DoD's "recorded but ... never silently dropped"
    requirement (which applies to every item, not just choice-interaction ones).
  * Last item's button reads "Submit" instead of "Next"; clicking it calls the existing
    `POST .../connections/:id/submit` (marks `submitted`, as today) and shows the
    confirmation screen.
  * Session-status gating (not-started / stopped messages) extends the existing
    status-check the placeholder already implicitly has — same session-status source
    (`GET /api/quiz-sessions/:sessionId`), just three render branches instead of one.
* New server endpoint: `POST /api/quiz-sessions/:sessionId/connections/:connectionId/answers`
  — one call per item, on each Next/Submit click, persisting `{itemIdentifier, responses}`.
  Anonymous, no-tenant, same guard pattern as the existing `.../connections` and
  `.../submit` routes (ROUTE-ID-GUARD-001's malformed-id → 404 pattern applies here too).
  New table `quiz_session_answers` (Drizzle), owned by this story (AUTO-EVAL only adds rows
  to it and reads it, never alters its shape): `id` (uuid pk), `connectionId` (fk to
  `quiz_session_connections`), `itemIdentifier`, `responses` (jsonb, nullable — the raw
  `responses.RESPONSE` shape from `serialize()`, deliberately *not* persisting
  `serialize()`'s `outcomes`, per the spike's §3 "trap" finding that those are always
  unscored zeros), `gradingStatus` (`'pending' | 'ungraded' | 'graded'` — all three values
  declared in this story's own migration even though this story only ever writes `'pending'`
  for a normal choice-interaction answer or `'ungraded'` directly for an unsupported-item
  row per the interaction-type gate above; QUIZ-AUTO-EVAL-001 is the only story that
  transitions a row to `'graded'`, without needing its own migration since the value already
  exists), `maxScore` (float, set at write time from the item's declared maximum — `1` for a
  standard `match_correct` choice item, `0` for an `'ungraded'` unsupported-item row, so an
  ungraded item never inflates a connection's denominator), `score` (nullable float, always
  null when written by this story). This is the data QUIZ-AUTO-EVAL-001 scores against.
* Styling: `QuizSessionTakePage`'s own chrome (counter, Next/Submit buttons, messages) uses
  shadcn/ui per ADR-0006, same as every other screen. The qti3 item render area itself is
  not shadcn/ui-styled — it's inside the player's shadow DOM (see ADR-0011's Consequences).
* Testing — **jsdom → e2e for the rendering path** (decided at sprint planning, per
  ADR-0011's Consequences and the spike's §4 finding):
  * `client/src/QuizSessionTakePage.test.tsx` (currently vitest/jsdom) is split: any
    non-rendering logic (status-branch selection, session-status fetch handling) that
    doesn't need the actual qti3 web component can stay as a vitest unit test; the actual
    item-rendering/Next/Submit-sequencing behavior moves to Playwright e2e, since jsdom
    compatibility for the Custom Element is unverified (spike finding, not re-checked here).
  * `client/e2e/quiz-session-take.spec.ts` is rewritten to drive a real multi-item
    choice-only quiz through the actual UI (join → answer each item → submit → confirmation)
    instead of today's stub-button flow — explicit sprint scope (see `sprint.md`).
  * `client/e2e/quiz-session-monitor.spec.ts` is updated for the same reason: its "answers"
    assertions currently mean "clicked the stub button" and need to mean "completed the real
    quiz" once this story ships (see `sprint.md`'s cross-cutting note on this).
  * New fixture `server/test-fixtures/qti-samples/sample-accept-text-entry-unsupported.xml`
    (added at sprint planning) exercises the unsupported-interaction-type placeholder path,
    which no existing fixture (all `qti-choice-interaction`) could test.
* Sequenced before QUIZ-AUTO-EVAL-001 (dependency).

Implementation notes (development, 2026-09-17): two endpoints this plan
described but didn't name a shape for at planning time, landed as part of
this story —
* `GET /api/quiz-sessions/:sessionId/status` (anonymous): `{ status }`
  only, not `toResponse`'s full trainer shape — the take page's
  not-started/running/stopped gate needed an anonymous status source, and
  the existing `GET /api/quiz-sessions/:sessionId` is tenant-gated.
* `GET /api/quiz-sessions/:sessionId/items` (anonymous, `running` only —
  `409` otherwise, so the questions aren't fetchable via the take-URL
  outside the window the trainer opened it for): `{ items: [{identifier,
  path, xml, supported}] }`. `supported` is computed server-side via
  `@longsightgroup/qti3-core`'s `registryStatus` (this story's dependency
  on it was moved up from QUIZ-AUTO-EVAL-001's plan to here, since
  rendering needs the same check AUTO-EVAL's scoring does) — the client
  never decides this itself, so a crafted request can't mark an
  unsupported item as gradable or vice versa. `path` (the item's
  `quiz_files.relativePath`) is echoed back by the client on
  `POST .../answers` and is what `quiz_session_answers.itemPath` stores —
  added to that table's own migration for this reason, so
  QUIZ-AUTO-EVAL-001 can re-fetch the exact item XML to score against
  without a second migration. `itemIdentifier` is the item's own root
  `identifier`, not a `qti-assessment-item-ref`'s — a standalone
  single-item quiz has no ref to take one from.
* `server/package.json` gains `@longsightgroup/qti3-core@0.10.5` directly
  (not just transitively via the client's player package) — see the
  `supported`-computation note above. ADR-0011 updated to reflect this.

Post-review bug fixes (manual UAT against the live server, 2026-09-19 — found
by the human clicking through the built app, not by the automated suite):
* Layout: `QuizSessionTakePage`'s outer `Card` was `max-w-sm text-center` for
  every state, including the question-rendering one — a width sized for the
  short status messages (joining/not-started/stopped), not for the qti3
  player's actual question/answer content, which was clipped. Fixed by
  widening the card (`w-full max-w-3xl`) only while a question is actually
  showing; the short-message states keep the original narrow, centered card.
* Invisible question/answer text under OS/browser dark-mode preference:
  `qti-assessment-item-player` (light DOM, not shadow DOM — corrects this
  story's plan/ADR-0011 assumption above) sets `this.style.colorScheme =
  "light dark"` on itself at runtime. This app has no dark theme, so under a
  dark OS/browser preference the player's own CSS system colors
  (`CanvasText`/`light-dark()`, see `base-styles.js`) resolved to white text
  sitting on the app's plain light background. Fixed in `client/src/
  index.css`: `:root { color-scheme: light }` plus a targeted
  `qti-assessment-item-player { color-scheme: light !important }` (only
  `!important` can outrank the element's own inline style). Verified via
  Playwright screenshots with `colorScheme: 'dark'` emulation, before/after.
