ID: QUIZ-SESSION-PER-STUDENT-DELIVERY-001

Status: DONE

Priority: Medium

Effort: 5

Current State:
* `GET /api/quiz-sessions/:sessionId/items` serves every student in a session the exact same
  item/choice order (`resolveQuizItems`'s file-order, `qti-ordering`/`shuffle` attributes are
  parsed nowhere in `server/`). Neither `QUIZ-RANDOM-QUESTION-ORDER-001` nor
  `QUIZ-RANDOM-ANSWER-ORDER-001` can be built without a way to compute and serve a per-connection
  order, and both stories need the same plumbing — split out here per the sprint-planning
  activity's "shared overhead gets its own PBI" rule.
* No XML serializer exists in `server/` (`sax` is parse-only) — reordering a `qti-choice-interaction`'s
  choices means composing new, well-formed XML server-side.

Scope:
* `quiz_sessions` gains `force_shuffle_questions` and `force_shuffle_answers` (boolean, not null,
  default false), set via `POST /api/quiz-sessions/:sessionId/start`'s body, alongside the
  existing `timeLimit`. A migration via `npx drizzle-kit generate --name
  add_force_shuffle_and_connection_order` (see ADR-0013).
* `quiz_session_connections` gains `item_order` (jsonb, nullable) and `choice_order` (jsonb,
  nullable) — the persisted per-connection permutation, generated lazily on first use.
* `server/package.json` gains `@xmldom/xmldom` (see ADR-0013 for why this library).
* A new module resolves, for one connection: the effective question order (item identifiers) and,
  per shuffled `qti-choice-interaction` item, the effective choice order — combining the session's
  force-shuffle setting with that item/section's own authored `shuffle` attribute, per ADR-0013's
  "force OR authored" rule. Generated once per connection, persisted with an atomic
  `UPDATE ... WHERE item_order IS NULL RETURNING ...` (handles a double-fired mount effect without
  two permutations racing).
* `GET /api/quiz-sessions/:sessionId/items` is replaced by
  `GET /api/quiz-sessions/:sessionId/connections/:connectionId/items`, verifying the connection
  belongs to the session, returning items in that connection's effective order with each shuffled
  item's `qti-simple-choice` children reordered in the returned XML (via `@xmldom/xmldom`
  parse → reorder → serialize), everything else byte-identical to today's output.
* Update every caller of the old endpoint: `client/src/QuizSessionTakePage.tsx`,
  `QuizSessionTakePage.test.tsx`, `client/e2e/quiz-session-take.spec.ts`.
* A new QTI fixture package (built from `aulea-plugin-jinja2/template/reference/quiz_spec.md`'s
  authored shape) with `shuffle="true"` on both a `qti-choice-interaction` and a `qti-ordering`
  section — every existing fixture in this repo uses `shuffle="false"` and no fixture has
  `qti-ordering` at all, so the "off = follow authored XML" path currently has no test data.

Out of Scope:
* The trainer-facing UI toggles for these two settings — each of `QUIZ-RANDOM-QUESTION-ORDER-001`
  and `QUIZ-RANDOM-ANSWER-ORDER-001` owns its own toggle's UI.
* Any interaction type other than `qti-choice-interaction` (matches ADR-0011's existing scope).
* `qti-simple-choice fixed="true"` has no real authored case in this repo or in
  `aulea-plugin-jinja2` today (grepped, zero hits) — kept in place under force-shuffle per
  ADR-0013, but not exercised by this PBI's own tests; flagged as an assumption for review.

Definition of Done:
* `force_shuffle_questions`/`force_shuffle_answers` persist on `quiz_sessions`, settable via
  `/start`, defaulting to `false`.
* `item_order`/`choice_order` persist on `quiz_session_connections`, generated once per connection
  and stable across repeated fetches (verified: two consecutive calls to the new items endpoint
  for the same connection return the same order).
* `GET /api/quiz-sessions/:sessionId/connections/:connectionId/items` serves the correct effective
  order for all four combinations of {force on, force off} × {item/section `shuffle="true"`,
  `shuffle="false"`} — unit-tested against the new fixture package.
* A reordered item's served XML still parses via `parseQtiXml` with the same item identifier and
  the same set of choice identifiers as the authored source (only their order differs) — proven
  against a real fixture, not an invented shape.
* A reordered item renders correctly under `@longsightgroup/qti3-player-react` in a real-browser
  (Playwright/Chromium) check — the shuffled choices actually appear, in the served order, with no
  rendering breakage from the round-tripped XML.
* Two simultaneous connections against the same shuffled session receive different, independently
  generated orders (not guaranteed distinct, but generated independently — verified via two
  Playwright browser contexts, not two tabs of the same browser, since `connectionId` is
  `localStorage`-scoped per browser).
* `npm test` (both `client/` and `server/`) and the existing e2e suite stay green after the
  endpoint-path change.
