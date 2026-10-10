ID: QUIZ-SESSION-LIVE-STATUS-001

As:
a `trainer`

I want to:
watch a quiz session progress live once started — students connecting and (in stub form)
answers being registered — and see a final tally once stopped

So that:
I have visibility into whether/how students are actually taking the quiz

Definition of Done:
* the QR/URL from QUIZ-SESSION-CONTROL-001 leads to a placeholder page (not real quiz-taking):
  opening it registers a "joined" student; a single stub "submit" action registers an "answer"
* **Block #2** shows: before start — "not yet started" + joined count; while running — answers
  progress bar (submitted/joined) + time-remaining bar; after stop — total submissions only
  (e.g. "7/10")
* reopening a stopped session keeps Block #2's numbers accumulating rather than resetting

Implemented (sprint, 2026-08-23):
* `quiz_session_connections` table (migration `0008_steady_thunderbolt_ross.sql`) — one row
  per placeholder-page load (a reload counts as a second join; accepted limitation, no student
  identity exists yet to dedupe)
* connect/submit endpoints are anonymous (no session/tenant) — a student's phone has no login;
  they still follow ROUTE-ID-GUARD-001's malformed-id → 404 pattern
* `joinedCount`/`submittedCount` folded into the existing session response rather than a
  separate `/status` endpoint
* `QuizSessionMonitorPage`'s Block #2 polls while `closed`/`running`, stops once `stopped` —
  as a side effect this also self-corrects Block #1's status once `closesAt` passes without an
  explicit Stop (the client-only countdown had no way to notice that on its own)
* 128/128 server tests, 69/69 client tests; 2 new Playwright specs
  (`quiz-session-monitor.spec.ts`, `quiz-session-take.spec.ts`, two browser contexts —
  trainer + anonymous student) — paid off a coverage gap QUIZ-SESSION-CONTROL-001 had left
* manual, real browser: confirmed Block #1 self-corrects to Reopen on its own once `closesAt`
  passes (no reload), and a join/submit from a second browser context shows up on the trainer's
  Block #2 within one poll tick
* found, not fixed here (pre-existing, unrelated): Playwright's `webServer` teardown crashes
  the server with an unhandled pg-pool error when the disposable Postgres is torn down first —
  reproduces even on an unmodified pre-existing spec; flagged for sprint review
