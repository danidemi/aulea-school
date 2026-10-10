# ADR-0009: Real-time update mechanism for the Quiz Session Monitor's Block #2

## Status
Accepted — 2026-08-23

## Context
QUIZ-SESSION-LIVE-STATUS-001 needs Block #2 (connected count, answers progress, time
remaining) to update while a session is running, without the trainer manually refreshing the
page. This was left open at backlog grooming (2026-08-23) as "a technical question for
planning, not decided here."

Two options were on the table:
* **Polling** — the client re-fetches session status on an interval (e.g. every few seconds)
  via a plain `GET` endpoint.
* **Push (WebSocket or SSE)** — the server pushes updates as they happen.

## Decision
Use **polling**, on a short interval (a few seconds), against a plain `GET
/api/quiz-sessions/:sessionId/status` endpoint — no new server infrastructure.

* The existing stack (Express + a request/response model, no existing WebSocket/SSE
  infrastructure anywhere in `server/`) already supports polling with zero new dependencies
  or server-side connection-lifecycle management.
* A live classroom session has a small number of concurrent viewers (the trainer's own
  monitor tab, plus however many students are actually taking the quiz) and low update-rate
  requirements (a progress bar and a clock, not sub-second data) — polling's latency
  (bounded by the poll interval) is an acceptable trade for the operational simplicity of not
  introducing a persistent-connection mechanism.
* Push would need new server-side state (open connections per session, broadcast-on-change
  logic) with no other story yet needing that machinery — premature infrastructure for what
  this story alone requires.

## Consequences
* No new runtime dependencies for this decision.
* The client's Block #2 polls the status endpoint on an interval while the session is
  running, and stops polling (or polls much less frequently) once stopped, to avoid needless
  load.
* Revisit if a future story needs sub-second updates, a much higher viewer count per session,
  or push-based notifications elsewhere in the product — none of that exists today.
