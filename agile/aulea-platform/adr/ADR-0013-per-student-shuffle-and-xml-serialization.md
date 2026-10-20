# ADR-0013: Per-student question/answer shuffling — semantics and XML serialization

## Status
Accepted — sprint planning, 2026-09-22

## Context
Two backlog stories, `QUIZ-RANDOM-QUESTION-ORDER-001` and `QUIZ-RANDOM-ANSWER-ORDER-001`, both
picked into this sprint, need each student in a quiz session to see questions and/or answer
choices in an independent random order. Their shared plumbing is split into its own tech PBI,
`QUIZ-SESSION-PER-STUDENT-DELIVERY-001`, this ADR's implementation.

Two questions had to be settled before planning either story:

1. **What does the QTI XML's own `shuffle` attribute mean here?** Both `quiz-author`
   (`aulea-plugin-jinja2/template/reference/quiz_spec.md`) and every UAT/test fixture in this
   repo use `shuffle="true"`/`shuffle="false"` on `qti-choice-interaction` and `qti-ordering`.
   Verified live in this session: neither the installed `@longsightgroup/qti3-player*` nor
   `@longsightgroup/qti3-core` (`0.10.5`, both `client/node_modules` and
   `server/node_modules`) contains the string `shuffle` anywhere in `dist/` — the player does not
   implement the attribute at all. Today, an item authored with `shuffle="true"` (the plugin's own
   default) renders in fixed authored order for every student, identically. `resolveQtiItems.ts`
   confirms the same for question order: it reads `qti-assessment-item-ref` hrefs in file order
   and never looks at `qti-ordering` at all.
2. **How does the trainer's new session setting relate to that attribute?** Decided with the
   Product Owner at sprint planning: the setting is a **force-shuffle override**, not an
   independent replacement.
   * **Force shuffle ON** — every applicable question/choice-set is shuffled per student,
     regardless of what its own `shuffle` attribute says.
   * **Force shuffle OFF (default)** — the platform honors the item/section's own authored
     `shuffle` attribute, per student. An item authored `shuffle="true"` (the common case) is
     genuinely shuffled per student even though the trainer never touched the setting; an item
     authored `shuffle="false"` stays fixed.

   Consequence, explicitly accepted by the PO: this closes a dormant gap rather than only adding
   an opt-in feature. Existing uploaded quizzes authored with the plugin's `shuffle="true"`
   default start shuffling for real once this ships, with no trainer action required. Flagged as
   a cross-cutting note in `active_sprint/sprint.md`.

Rewriting a question's rendered choice order (or a test's item order) means the server must
compose an item's actual served XML — read the item's response/section XML, reorder specific
child elements, and produce well-formed XML again. `server/`'s only XML tooling today is `sax`
(`server/src/qti/validateQti3.ts`, `resolveQtiItems.ts`), a streaming parser with no DOM and no
serialization capability — string-splice reordering was considered and rejected by the PO in
favor of a real parse → mutate → serialize round trip.

## Decision

* **Semantics**: force-shuffle override, per the PO's framing above. `quiz_sessions` gains two
  independent booleans (`force_shuffle_questions`, `force_shuffle_answers`), set via the existing
  `POST /api/quiz-sessions/:sessionId/start` body next to `timeLimit`, both defaulting to `false`.
  Effective shuffling for a given item/section is `force = true OR that item/section's own
  shuffle="true"` — evaluated independently for question order (`qti-ordering` on the test's
  section) and each item's own choice order (`qti-choice-interaction`'s `shuffle` attribute).
* **Scope**: `qti-choice-interaction` items only, matching ADR-0011's existing rendering-support
  boundary — an item resolved as `supported: false` is never reordered (nothing to shuffle
  correctly). `qti-simple-choice fixed="true"` choices are kept in their authored position under
  force shuffle too (grep confirms `fixed=` is not used anywhere in
  `aulea-plugin-jinja2` or this repo's fixtures today, so this has no current real-world case —
  recorded as an assumption for review, not exercised by this sprint's own test data).
* **Where the order lives**: a persisted permutation per connection, not a re-derived seed.
  `quiz_session_connections` gains `item_order` (jsonb, nullable array of item identifiers) and
  `choice_order` (jsonb, nullable — map of item identifier to an array of choice identifiers).
  Both are generated lazily, once, on that connection's first items fetch while the session is
  `running`, using whichever of force-shuffle-on or the item/section's own attribute applies at
  that moment — not at join/connect time (a session's force-shuffle setting isn't set yet during
  the `closed` lobby, since it's only supplied to `/start`). Written with an atomic
  `UPDATE ... WHERE item_order IS NULL RETURNING ...` (re-reading if the row already had a value)
  to survive a double-fire of the take page's mount effect (e.g. React StrictMode) without two
  different permutations racing for the same connection.
* **Delivery endpoint**: `GET /api/quiz-sessions/:sessionId/items` becomes connection-scoped —
  `GET /api/quiz-sessions/:sessionId/connections/:connectionId/items`, following the existing
  `.../connections/:connectionId/answers` naming convention. It verifies the connection belongs to
  the session, resolves/generates that connection's order as above, and returns items reordered
  (and, for a shuffled item, with its `qti-simple-choice` children reordered inside the returned
  XML) accordingly. An unshuffled item/question is returned exactly as `resolveQuizItems` produces
  it today — no behavior change for that case.
* **XML library: `@xmldom/xmldom`.** Verified live (`npm view`): pure JavaScript, `engines.node
  >=14.6` (well under this project's Node baseline, see ADR-0017), no native/`node-gyp` step — consistent
  with ADR-0004's and ADR-0008's standing preference for a build-portable dependency tree. Gives a
  real DOM (`DOMParser`/`XMLSerializer`) for a correct, namespace-preserving reorder of
  `qti-simple-choice` siblings under `qti-choice-interaction`, rather than a regex/string splice
  over QTI's XML shape.
* Attribution (scoring, answer breakdown, session monitoring) needs **no code change** to
  understand a reordered item: `computeAnswerBreakdown` and `scoreChoiceAnswer` both re-parse the
  *authored* item XML independently and key everything off `itemIdentifier` /
  choice-`identifier`, never off position. Reordering only changes what a student is served, not
  what a stored response or the server-side scoring/breakdown path reads. Verified by inspection
  of both functions during this sprint's planning; each story's own DoD includes a test proving
  it (see the two stories' technical plans).

## Consequences
* `server/package.json` gains `@xmldom/xmldom` as a runtime dependency (plus `@types/xmldom` if
  the package doesn't ship its own types — checked when the tech PBI is implemented).
* `server/src/db/schema.ts` gains two `quiz_sessions` columns and two `quiz_session_connections`
  columns, via `npx drizzle-kit generate --name add_force_shuffle_and_connection_order`
  (next migration: `0011_...`, per CLAUDE.md's Drizzle migration naming rule).
* `GET /api/quiz-sessions/:sessionId/items` is replaced by
  `GET /api/quiz-sessions/:sessionId/connections/:connectionId/items` — every caller must move to
  the new path: `client/src/QuizSessionTakePage.tsx`, `QuizSessionTakePage.test.tsx`, and
  `client/e2e/quiz-session-take.spec.ts`.
* `POST /api/quiz-sessions/:sessionId/start`'s body gains `forceShuffleQuestions` /
  `forceShuffleAnswers`, both optional booleans defaulting to `false` — trainer-facing UI for
  these two toggles is each story's own scope, not this tech PBI's.
* Existing quizzes authored with the plugin's `shuffle="true"` default begin shuffling for real
  per student, per session, from this point on — an accepted, PO-approved behavior change, not a
  regression. `active_sprint/sprint.md` flags it as a cross-cutting note for sprint review.
* No test fixture in this repo currently exercises `shuffle="true"` (every fixture uses
  `shuffle="false"`, no fixture has `qti-ordering` at all) — the tech PBI's own DoD adds a new
  fixture package built from `quiz_spec.md`'s authored shape, covering both a shuffled choice
  interaction and a shuffled `qti-ordering` section, so the "off = follow XML" path has real test
  data, not just the forced path.
* Revisit if a future interaction type beyond `qti-choice-interaction` needs delivery-order
  shuffling — out of scope for both stories and this ADR.
