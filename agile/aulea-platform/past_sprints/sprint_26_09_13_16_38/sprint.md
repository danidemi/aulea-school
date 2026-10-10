# Sprint plan — started 2026-08-23 (evening)

## Scope

All 3 currently `READY` backlog stories, taken into this sprint at the human's explicit
request ("plan to execute all PBIs in the backlog and start the sprint") — a deliberate
deviation from CLAUDE.md's "choose the smallest possible subset" default, same as the
previous sprint.

1. **ROUTE-ID-GUARD-001** — fix the malformed-course-id crash (Small effort).
2. **QUIZ-SESSION-CONTROL-001** — quiz session create/start/stop/reopen + Block #1 (Medium
   effort).
3. **QUIZ-SESSION-LIVE-STATUS-001** — Block #2 live counts + placeholder student page
   (Medium effort).

## Development sequence

1 → 2 → 3, fixed at planning:
* ROUTE-ID-GUARD-001 first: it's small, independent, and establishes the
  try/catch-around-a-tenant-scoped-lookup pattern that both quiz-session stories' new routes
  should follow from the start, rather than copying the bug forward into new code.
* QUIZ-SESSION-CONTROL-001 second: QUIZ-SESSION-LIVE-STATUS-001 depends on it directly (a
  real session + Block #1 has to exist before Block #2's counts mean anything).
* QUIZ-SESSION-LIVE-STATUS-001 last.

## Technical decisions (new ADRs this sprint)

* **ADR-0008** — QR code generation: client-side, `qrcode` npm package (pure JS, no native
  build step, consistent with ADR-0004's `bcryptjs` rationale).
* **ADR-0009** — Block #2's real-time update mechanism: polling against a plain `GET`
  status endpoint, no new server infrastructure (no WebSocket/SSE) — matches this stack's
  existing request/response model and the scale of a single classroom session.

Grounded against existing ADRs: TypeScript/Node/React/Express (ADR-0001), Drizzle/Postgres
(ADR-0003), tenant-scoped data access via joins rather than denormalized tenant columns
(pattern already used by `quizzes.ts`, followed by the new `quiz_sessions` table),
`react-router-dom` v6 route-table convention (ADR-0004), shadcn/ui components (ADR-0006) —
no story in this sprint needs a stack change beyond the two new ADRs above.

## Per-story technical plans

See each story file's own "Technical plan (sprint planning, 2026-08-23)" section:
`story_malformed_course_id_crash.md`, `story_quiz_session_control.md`,
`story_quiz_session_live_status.md`.

## Known accepted gaps, flagged now rather than discovered at review

* QUIZ-SESSION-LIVE-STATUS-001's connection-counting model (one row per page load) over-counts
  a "connected" student who reloads the placeholder page. Accepted per that story's own DoD —
  no real student identity exists yet to dedupe against.
* No session-list/history view exists after this sprint (explicitly out of scope for both
  quiz-session stories) — a trainer can only reach a session's monitor page right after
  creating it. Expected to be its own future story.
* The real student quiz-taking experience remains unbuilt — QUIZ-SESSION-LIVE-STATUS-001
  only ships a placeholder page at the QR/URL target.
