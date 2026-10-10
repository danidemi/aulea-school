# Sprint review — 2026-09-13

## Outcome

All 3 stories accepted by the human as DONE, no changes requested.

1. **ROUTE-ID-GUARD-001** — malformed-course-id crash fixed. A non-UUID course id segment
   now returns a normal 404 JSON error instead of crashing the server process for every
   tenant.
2. **QUIZ-SESSION-CONTROL-001** — quiz session create/start/stop/reopen lifecycle + Block #1
   of the Quiz Session Monitor (QR code, URL, state transitions) shipped.
3. **QUIZ-SESSION-LIVE-STATUS-001** — Block #2 live connected/answered counts + a placeholder
   student-facing page (registers presence on page load) shipped.

## What was decided

* ADR-0008: client-side QR generation via the `qrcode` npm package.
* ADR-0009: Block #2 live updates via polling a plain `GET` status endpoint — no
  WebSocket/SSE infrastructure added.
* ROUTE-ID-GUARD-001 done first, deliberately, to establish the
  try/catch-around-a-tenant-scoped-lookup pattern before the two quiz-session stories'
  new routes were written, rather than copying the crash bug into new code.

## Known accepted gaps (carried forward, not defects)

* Live "connected" count over-counts a student who reloads the placeholder page — no real
  student identity exists yet to dedupe against.
* No session-list/history view exists — a trainer can only reach a session's monitor page
  right after creating it.
* The real student quiz-taking experience is still unbuilt; only a placeholder page exists
  at the QR/URL target.

## Sprint archived

Moved from `active_sprint/` to `past_sprints/sprint_26_09_13_16_38/`:
`sprint.md`, `story_malformed_course_id_crash.md`, `story_quiz_session_control.md`,
`story_quiz_session_live_status.md`, `assets/`.
