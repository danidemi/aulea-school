# Spike: `qti3` for QUIZ-TAKE-RENDER-001

Date: 2026-09-17. Ran against the real fixtures in
`server/test-fixtures/qti-samples/` (the same items packaged into
`geography-quiz.zip` by `scripts/uat.sh`): one `qti-choice-interaction`
single-select item, one multi-select item, and the `test.xml` that wraps them.

## 0. Naming correction

There is no npm package literally named `qti3`. The LongsightGroup QTI 3
project (`github.com/LongsightGroup/qti3`) publishes a family of scoped
packages instead:

* `@longsightgroup/qti3-core` — framework-neutral parsing/scoring (TS, no deps)
* `@longsightgroup/qti3-player` — the `<qti-assessment-item-player>` Web Component
* `@longsightgroup/qti3-player-react` — thin React wrapper around it

All three are real, MIT-licensed, actively published (latest `0.10.5`,
2026-09-10), single maintainer (`ottenhoff@longsight.com`), inter-package deps
exact-pinned to the same version. Weekly downloads (npm API, 2026-09-05 to
2026-09-11): `qti3-player-react` 174, `qti3-core` 265 — low but non-zero,
consistent with "maturity/adoption not yet vetted" from grooming. Still
pre-1.0 (`0.x`) — API can break between minors.

## 1. It renders one item at a time — nothing more

`@longsightgroup/qti3-player`'s own docs are explicit: the *player component*
does not resolve `qti-assessment-test` item-refs and does not manage
Next/Submit across a test — that part is always hand-written host code,
regardless of which of the three candidate libraries wins. `src/testSequencer.ts`
in this spike is that shell: ~15 lines to parse `test.xml`'s item-refs. The
full multi-item flow (`src/App.tsx`'s `TestSequenceDemo`) — index, per-item
capture, Next vs. Submit on the last item, confirmation screen — is ~60 lines.

That said, `qti3-core` *does* model test structure (it just isn't wired into
the player): it exports `QtiAssessmentTestPackageModel`,
`QtiAssessmentTestItemRef`, `QtiTestPartNavigationMode`,
`QtiTestPartSubmissionMode`. So the accurate split is: the player doesn't
sequence; the core can parse and describe test structure, a host still drives
navigation off it. `test.xml`'s `navigation-mode="linear"` is a value this
spike's sequencer implicitly assumes (forward-only, no Back) — matches the
DoD's Next/Submit-only requirement, but a future `nonlinear` test part isn't
handled by this shell.

This lines up with ADR-0010: the server already resolves item-refs from
`quiz_files` by relative path, so the client only ever needs one item's XML
at a time; it never needs to parse `test.xml` itself in the real story (this
spike does, only because it has no server to ask).

## 2. Rendering: works, matches scope exactly

Verified in a real Chromium (Playwright), not jsdom — see §4:

* `max-choices="1"` → radio buttons (single-select)
* `max-choices="0"` → checkboxes, **unlimited**, not "none allowed" (the
  edge case worth checking — confirmed correct)
* Both items rendered with zero console/page errors
* Chrome (labels A/B/C, selected-state highlight) comes from the web
  component itself, unstyled by us — screenshots in `screenshots/`

Standalone single-item mode (no `test.xml`) works with the exact same
component — the DoD's "single-item quiz still works" sub-bullet is free,
same code path as one item inside a sequence.

### The "unsupported interaction type" placeholder bullet is likely near-free

`qti3-core`'s `QtiInteractionType` union lists 20 QTI 3 interaction types
(`associate`, `gapMatch`, `hotspot`, `match`, `order`, `slider`,
`textEntry`, `extendedText`, ... plus `choice`) — qti3 already parses and
(per its player docs) renders most of these. **Scoping this story to
`qti-choice-interaction` only is this repo's own deliberate narrowing (no
other type is authored yet), not a qti3 limitation.** Each parsed
`QtiInteraction` also carries a `registryStatus: "supported" |
"deprecated" | "unsupported"`, and the player's `qti-statechange` event's
`validationMessages` documents surfacing "unsupported interactions" as a
load-time authoring diagnostic. Not exercised in this spike (no
non-choice fixture exists to test against), but it means the placeholder
bullet is plausibly a few lines checking `registryStatus`/validation
messages rather than a type-detection system written from scratch.

## 3. Response capture shape

`ref.serialize()` returns a `QtiAttemptStateV1`:

```json
{
  "schema": "qti3.attempt-state.v1",
  "itemIdentifier": "multiple-choice-basic",
  "status": "interacting",
  "responses": { "RESPONSE": ["choice_a", "choice_c"] },
  "outcomes": { "SCORE": 0, "completionStatus": "unknown" },
  "templateValues": {},
  "interactionStates": {},
  "validationMessages": []
}
```

`responses.RESPONSE` is a plain identifier or array of identifiers —
directly what `quiz_session_connections`-style per-connection answer storage
needs to persist. No adaptation needed for this story's "answer recorded
against the connection" DoD bullet.

**Trap for whoever builds QUIZ-AUTO-EVAL-001**: in the JSON above, note
`serialize()`'s own `outcomes.SCORE` is `0` even though the answer is
correct — `serialize()` returns unscored default outcomes; `SCORE` only
becomes meaningful after `scoreAttempt()`/`session.score()` runs (§5). This
story persists `responses` only, which is correct and doesn't hit this — but
if a later story persists `serialize()`'s `outcomes` directly and treats
them as real scores, it'll silently store zeros.

## 4. Browser vs. jsdom — not verified for jsdom, don't assume

`qti-assessment-item-player` is a real Custom Element (shadow DOM,
`customElements.define`). This spike verified rendering + interaction only
under Playwright/Chromium (`drive.mjs`), not vitest/jsdom. Per the
sprint_26_08_21 do/don't ("don't declare render behavior verified through a
shortcut"), jsdom compatibility is **not confirmed either way here** — it
would need its own check (ResizeObserver/MutationObserver polyfills, shadow
DOM support in jsdom's version). Practical implication for the real story:
budget the DoD's "automated where feasible" as Playwright/e2e tests for the
rendering path, not vitest unit tests, unless a follow-up check proves jsdom
works.

Blast radius: `client/src/QuizSessionTakePage.test.tsx` (the file testing the
page this story replaces) is a vitest/jsdom test today. If the real
implementation's rendering can't be unit-tested under jsdom, that test file
moves to Playwright e2e rather than staying vitest — flag this explicitly at
sprint planning so it isn't rediscovered mid-sprint (see
`references/do_and_donts.md`, sprint_26_09_16: check what depended on the
old shape before assuming DoD-level automated coverage carries over).

## 5. Scoring: works server-side too, no browser needed

The player's own docs say browser `scoreAttempt()` is local
preview/convenience only and must not be treated as authoritative.
`@longsightgroup/qti3-core` exposes the same scoring engine standalone:

```ts
const parsed = parseQtiXml(xml)
const session = createItemSession(parsed.document)
session.respond('RESPONSE', ['choice_a', 'choice_c'])
session.score() // -> { outcomes: { SCORE: 1, ... } }
```

Ran this in plain Node (`src/scoreNode.ts`, `npm run score:node`) against
both fixture items, correct and incorrect responses each — all four scores
matched the authored `qti-correct-response`/`match_correct` processing
exactly. **This is informational for QUIZ-AUTO-EVAL-001**: authoritative
server-side scoring of a recorded response, from the same item XML this
story already stores, is one `qti3-core` call — no hand-written scoring
logic needed for `qti-choice-interaction` if that story also adopts qti3.

No network dependency: both fixtures declare
`qti-response-processing template=".../rptemplates/match_correct"`, which
looks like it needs fetching. It doesn't — checked the installed package
directly (`npm pack`, then grepped `dist/`): there is no `fetch(` anywhere
in `@longsightgroup/qti3-core`, and `processing-templates.js` matches the
template purely by its URL's trailing filename (`match_correct`) against a
local lookup table. Scoring works fully offline; no risk from a flaky
student/trainer-room network.

Bonus, out of scope for this spike but worth flagging for ADR-0010/sprint
planning: `qti3-core` also exports `parseQtiPackage(bytes)`, which parses a
whole zip (manifest + test.xml + item refs) into a neutral model directly
from a `Buffer`/`Uint8Array` — the same shape ADR-0010's `adm-zip` +
in-memory-Buffer upload handling already produces. Not evaluated here
(server-side, different story's territory), but it's a candidate to replace
or validate against the hand-rolled `validateQti3.ts` href-resolution logic.

## 6. Peer/version fit

`qti3-player-react` peer deps: `react >=18.2 <20`, `react-dom >=18.2 <20`.
`client/`'s React `18.3.1` is in range. No conflict with ADR-0001.

## Recommendation

`qti3` (i.e., the three `@longsightgroup/qti3-*` packages) does what the
story needs for `qti-choice-interaction`: correct single/multi-select
rendering, correct response capture, and correct scoring (client preview
*and* authoritative server-side via the same core package) — verified
against this repo's actual fixtures, not just the README. The main real risk
is the one already named in grooming: pre-1.0, single maintainer, low
adoption. The "framework mismatch" risk that ruled out `qti3-item-player`
doesn't apply here — this adapter is React-native.

The test-sequencing shell has to be hand-written either way (§1) — it is not
a point against `qti3` specifically, and it's small.

## Reproducing

```
cd spikes/qti3-render
npm install
npm run score:node          # server-side scoring, no browser
npm run dev                 # http://localhost:5183, click through by hand
# or, with a dev server already running on :5183:
npx playwright install chromium   # first time only
node drive.mjs               # headless click-through, writes screenshots/
```
