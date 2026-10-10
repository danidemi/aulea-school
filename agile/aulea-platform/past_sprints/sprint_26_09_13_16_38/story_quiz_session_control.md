ID: QUIZ-SESSION-CONTROL-001

As:
a `trainer`

I want to:
create a quiz session, start it (optionally with a time limit), stop it, and reopen a stopped
session if needed

So that:
I can control a quiz's live delivery from one screen, with a session record that persists
across start/stop/reopen instead of being a one-shot action

Definition of Done:
* from a quiz's page, create a **quiz session** (a quiz can have several over time, all kept)
* creating one opens the "Quiz Session Monitor" page: a QR code + plain-text URL, and
  **Block #1** (session control) — closed: time-limit input + Start; running: clock-time and
  duration-remaining (same deadline shown two ways) + Stop; always reopenable after stopping
  (closed is not a dead end)
* **Block #2** (live status) present as a static placeholder this story — real counts are
  QUIZ-SESSION-LIVE-STATUS-001's scope

Implemented (sprint, 2026-08-23):
* `quiz_sessions` table (migration `0007_nosy_unicorn.sql`); status (`closed`/`running`/
  `stopped`) is derived on read from timestamp columns, not stored — avoids a background job to
  flip a status at the deadline (ADR-0009)
* time-limit format `<int>h`/`<int>m`, server-validated, optional; reopening reuses the same
  "start" endpoint (clears `stoppedAt`, resets the deadline)
* `server/src/db/quizSessions.ts`, `server/src/routes/quizSessions.ts` (create/start/stop/get),
  written from the start using ROUTE-ID-GUARD-001's try/catch-on-lookup pattern
* session URL computed server-side from `APP_BASE_URL` (ADR-0008), never built client-side
* `client/src/QuizSessionMonitorPage.tsx` (QR via `qrcode`'s inline-SVG output, no canvas)
* 121/121 server tests, 61/61 client tests; both builds clean
* manual, real-browser click-through (ad hoc Playwright, not committed) caught a real defect
  unit tests missed: a stopped session showed a permanently-disabled Stop button with no way
  back in — fixed (stopped now renders the same Start-labeled-"Reopen" control as closed) and
  locked in with a regression test before re-verifying
