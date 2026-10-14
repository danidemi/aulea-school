# DOs and DON'Ts

Running log of process decisions made during retrospectives, to apply in later sprints.
Newest entries at the bottom.

## sprint_26_08_20

* **DO** write a concrete, checkable Definition of Done for a story before starting
  implementation. It removed ambiguity during HOME-001's build — the only rework came from
  a legitimate new decision at sprint review, not from a spec gap.
* **DO** draw a wireframe before implementing a story that involves a large part of the
  front end, at least when the story's own text does not already give enough visual detail
  (layout, colors, placement of elements). Do this during grooming or right before
  development starts, not after a first implementation attempt.
* **DON'T** treat backlog grooming's "check for inconsistencies among other stories" step as
  done without explicitly checking whether stories share the same page/component (e.g.
  HOME-001 and LOGIN-001 shared the same header). This coupling should surface during
  grooming, not later during sprint planning.

## sprint after sprint_26_08_20 (backlog grooming, 2026-08-20)

* **DO** use standard Scrum semantics for story status: `DRAFT` → `READY` once the story has
  passed its Definition of Ready (groomed, DoD is solid, sprint-eligible) → `DONE` once it has
  passed its Definition of Done and been accepted at review. `READY` does **not** mean
  "already developed" — LOGIN-001 was correctly `READY` (groomed, not yet built) and no status
  change was needed for it; the earlier reading of CLAUDE.md's Activity 3 wording caused
  confusion on this point, worth avoiding next time.
* **DON'T** let a sprint review's "carried over as a backlog candidate" note (e.g. the
  `npm audit` finding) stay unconverted into an actual backlog story. It went missing between
  the HOME-001 review and this grooming session; a story now exists
  (`backlog/story_dependency_vulnerabilities.md`).
* **DO** catch duplicate story IDs during grooming, not later. Three drafts (course creation,
  dashboard, selection) all used the same ID (`COURSE-MANAGEMENT`) because they were, in fact,
  one screen — merging them into one story (`story_course_dashboard.md`) fixed both the
  duplication and the artificial three-way split at once.

## sprint_26_08_21

* **DO** verify a "works from scratch" or "is a no-op on repeat" Definition of Done claim
  against a genuinely *reset* state, not an already-set-up one. DB-MIGRATIONS-001's
  idempotency check only meant something because the Postgres container/volume was torn down
  and brought back up clean first, then inspected directly (`\dt`, the migrations tracking
  table) rather than trusting a log line.
* **DON'T** verify startup/build behavior through a dev-mode shortcut (e.g. `tsx
  src/index.ts`) when the story's Definition of Done is about the built/started app. A
  `tsconfig.json` edit silently changed `tsc -b`'s output layout (dropped `rootDir`, widened
  `include`); the stale pre-change `dist/index.js` was never overwritten, and `tsx` bypassed
  `dist/` entirely so this went unnoticed. Always run the actual documented command (`npm run
  build && npm start`) at least once before calling that behavior verified — this bug was only
  caught because the human ran that exact command.

## sprint_26_08_22_15_56

* **DO** verify against a disposable server instance on its own port, with matching
  `APP_BASE_URL`, instead of the human's long-running dev server — a stale process can
  silently 200 unroutable paths via the SPA fallback and produce a false pass.
* **DON'T** run `npm run db:migrate` manually before starting the server — migrations
  already run automatically on startup (`server/src/index.ts`); a manual run is redundant
  and adds a step that can drift from what actually happens in production-like startup.

## sprint_26_08_23_12_32

* **DO** flag cross-cutting gaps once in the sprint-level file (`sprint.md`), not buried
  separately inside every story's own Verification section — this sprint's two flagged gaps
  (no browser click-through anywhere; no visual sign-off on UI-FOUNDATION-001) both got
  resolved at review because they were visible in one place, not lost in eight copies.
* **DON'T** assume a tool, dependency, or environment capability (browser-automation
  tooling, network/internet access, etc.) is unavailable without checking it live at the
  time it matters. This sprint asserted twice, across all 8 stories, that "no
  browser-automation tooling exists in this repo" and that QTI-22-IMPORT had "no network
  access to fetch the schema" — both were wrong (`npx playwright --version` returned
  `1.62.1`; internet access was in fact available), and neither was re-checked before being
  repeated story after story. The environment can also change mid-session (e.g. a tool
  installed after the check was last made) — re-verify rather than trust a stale
  assumption or a memory of an earlier check.

## sprint_26_09_16_18_06

* **DO** run a blast-radius check when a story changes an existing data shape or behavior:
  search for other stories, scripts, or fixtures whose own DoD/Notes depended on the old
  shape, not just the source files that reference it in code. QUIZ-PACKAGE-STORAGE-001's DoD
  covered every code call site of the old "one file per quiz" assumption but missed that
  QTI-UAT-SAMPLES-001's fixtures were also reused for manual UAT upload — a human had no
  ready-made `.zip` to attach for the new package path. Caught this sprint only because the
  human asked about it directly at review, not because grooming/planning surfaced it.

## sprint_26_09_19_00_00

* **DO** attach a screenshot (or before/after pair, for a visual bug fix) whenever declaring a
  GUI-touching story or fix done, so the human can sight-check the result without pulling up
  the running app themselves — explicit human ask this sprint. Cheap for minor GUI work
  (already-open dev tooling can grab one); skip only when the change is genuinely not visual.
* **DON'T** assume the automated suite (unit + e2e) covers a GUI story's visual correctness.
  Both post-review bugs this sprint (a card too narrow for its content; question text invisible
  under dark-mode preference) were purely visual/CSS defects — `tsc -b`, vitest, and the e2e
  specs all stayed green through both, because they assert on DOM/text presence, not on layout
  width or actual rendered color. A GUI story's DoD needs an explicit real-browser visual
  look (screenshot or live click-through), not just "tests pass," especially for
  preference-dependent rendering (color-scheme, viewport size) that a default-settings glance
  won't surface either.

## sprint_26_09_20 (backlog grooming, 2026-09-20)

* **DON'T** mark a story `DONE` at Sprint Review without checking the actual source repo's
  code/`git log`, not just the human's verbal "current story is OK." QUIZ-CONNECTION-INTEGRITY-001
  was marked `DONE` and archived on that basis, but none of its DoD existed in
  `aulea-platform` and there was no commit for it at all — caught only at the next grooming
  session by grepping the real code, and had to be reopened. Before closing a story at review,
  grep/read the specific files its DoD names, or the human's approval can't be trusted to reflect
  what's actually shipped.

## sprint_26_09_20_22_55

* **DON'T** write "no screenshot/visual check was run" into a GUI-touching story's
  "Implemented" section as a note for the human to catch at review, instead of actually
  running the check during development. This sprint repeated a gap already on file
  (`sprint_26_09_19_00_00`'s screenshot DON'T) for two of four items
  (`BUG-QUIZ-REFRESH-DUP-SESSION`, `QUIZ-TAKE-URL-LINK-001`) — noticing the gap isn't
  enough if it isn't closed before declaring the story done. Concretely: before writing
  "Implemented" for a story whose DoD touches rendered UI, check live whether
  browser/screenshot tooling is available (per the `sprint_26_08_23_12_32` DON'T — don't
  assume it's missing without checking) and take the screenshot as part of
  implementation, not as a deferred note.

## sprint_26_09_21_19_34

* **DO** verify GUI-touching stories with a real-browser (Playwright/Chromium) screenshot against
  live/mocked data, not just component tests. QUIZ-CLASS-REVIEW-001's rendered screenshot is what
  surfaced the missing question-text bug — `data-testid` presence checks in the component tests
  would never have caught it, since the prompt field was simply empty/undefined rather than absent
  from the DOM.
* **DON'T** write a unit test fixture that encodes the same wrong assumption as the code under
  test, instead of checking it against how the data is actually produced in this codebase.
  QUIZ-CLASS-REVIEW-001's original prompt test injected `<qti-prompt>` directly under
  `<qti-item-body>`, which isn't how any real authored item or existing QTI sample fixture places
  it (always nested inside the interaction element) — so the test passed while the feature was
  broken for every real item, and the bug only surfaced when a human looked at the actual
  screenshot. Before writing a fixture for a parsed format already used elsewhere in the repo
  (QTI XML, stored JSON shapes, etc.), check an existing real sample/fixture for the true shape
  rather than inventing one that merely satisfies the code being tested.

## sprint_26_09_26_22_30

* **DO** treat "PBI done" as requiring, in order: the full unit test suite green, then (when
  reasonable) actually running the app and exercising the feature, then attaching the resulting
  screenshots/logs to the PBI itself as durable proof — not stopping right after the code edit and
  asserting it works. TESTDATA-001 is the positive case this sprint: running `scripts/seed.sh`
  end-to-end (not just `db-seed.ts`'s own code review) is what caught a real integration bug — it
  still called `QUIZ-SESSION-PER-STUDENT-DELIVERY-001`'s old items-endpoint shape, missing the new
  required `connectionId` segment, which no unit test in either story caught.
* **DON'T** report a PBI as done on the strength of unit tests alone, or without evidence attached
  to the PBI file — explicit human ask this retro, echoing a gap flagged repeatedly in earlier
  sprints (`sprint_26_09_19_00_00`, `sprint_26_09_20_22_55`, `sprint_26_09_21_19_34`) that kept
  recurring because it was being treated as a GUI-only rule rather than a general one.

## sprint_26_10_14_22_40

* **DO** exercise a new feature end-to-end against real Postgres in an e2e spec and take the
  screenshots from that run. SESSION-DELETE-001's row locks and cascade order are real SQL that
  the DB-free fakes only mirror; the e2e run is what actually exercised them.
* **DON'T** scope a PBI that introduces a UX pattern (table, destructive action, confirmation
  dialog, sortable header) to one screen without grepping every other screen for the same pattern.
  SESSION-DELETE-001 added a delete dialog while quiz delete in `QuizzesSection` still deletes with
  no confirmation, and only one table has sortable headers. State in the PBI which screens are
  covered and which are deferred (as separate PBIs).
