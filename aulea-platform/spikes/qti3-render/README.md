# qti3-render spike

## Why

`QUIZ-TAKE-RENDER-001` (`agile/aulea-platform/backlog/story_quiz_take_render.md`)
needs a QTI 3.0 player to render `qti-choice-interaction` items in-browser.
Grooming (2026-09-13) named three untried candidates; this spike tries the
first one, `qti3` (LongsightGroup), against this repo's own QTI fixtures
before sprint planning commits to it in an ADR.

## Running it

```
npm install
npm run score:node          # server-side scoring, no browser, no dev server needed
npm run dev                 # starts Vite on :5183 — click through by hand
```

Or drive it headlessly and capture screenshots (needs the dev server running
on :5183, and Chromium installed once via `npx playwright install chromium`):

```
node drive.mjs
```

Screenshots land in `screenshots/`; the two demos on the page are a
multi-item `test.xml` sequence (Next/Submit) and a standalone single item
with no test wrapper, matching the story's two DoD render cases.

## Conclusions

Full detail in `FINDINGS.md`. Short version:

* There's no npm package literally named `qti3` — it's
  `@longsightgroup/qti3-core` + `qti3-player` + `qti3-player-react`.
* Renders single- and multi-select choice interactions correctly (verified
  in real Chromium, not jsdom — jsdom compatibility is unchecked).
* Response capture (`serialize()`) and scoring (`scoreAttempt()` client-side,
  `qti3-core`'s `createItemSession` server-side) both verified correct
  against the real fixtures, with no network dependency.
* The player renders one item at a time by design — multi-item Next/Submit
  sequencing is always hand-written host code, not something any of the
  three candidates would remove.
* Recommendation: qti3 does what this story needs. Main residual risk is
  the one already flagged in grooming — pre-1.0, single maintainer, low
  adoption — not a functional gap found here.
