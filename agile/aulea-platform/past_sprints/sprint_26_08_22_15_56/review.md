# Sprint review — sprint_26_08_22_15_56

Sprint ran 2026-08-21 to 2026-08-22. Scope: 11 story points (SIGNUP-EXPEDITE-001, effort
3; SIGN-UP-001, effort 8) — see `sprint.md` for original planning.

## Outcome

Both stories accepted as DONE by the human on 2026-08-22.

### SIGNUP-EXPEDITE-001 — feature-flagged fast sign-up
* `GET /api/config` (`EXPEDITE_SIGNUP_ENABLED`), expedited `POST /api/signup` path,
  `password.ts` (bcryptjs, cost 10), `/signup` screen, `react-router-dom` introduced.
* Built the shared sign-up screen/endpoint and password module that SIGN-UP-001 then
  extended, as planned.

### SIGN-UP-001 — sign up with email + confirmation
* `POST /api/signup` (409 duplicate, 400 short password, unconfirmed user, no auto-login),
  confirmation email via Mailpit/nodemailer, `GET /api/confirm?token=...` with
  ok/expired/used/invalid redirect to `/confirm-result`, `confirmation_tokens` migration,
  `server/docker-compose.yml` Mailpit service.
* Automated tests: 29/29 server, 14/14 client (given/when/then). Manual verification of
  every DoD bullet against real Postgres + Mailpit, plus a browsing-only Playwright
  end-to-end pass (no URL guessed — every screen reached via a UI link) covering signup,
  duplicate/short-password rejection, Mailpit retrieval, confirm, reuse, and an
  unrecognized token.
* `README.md` updated with Mailpit GUI access instructions and the `db:up` step.

## What worked well
* Splitting the shared screen/endpoint/password-module work into SIGNUP-EXPEDITE-001 and
  letting SIGN-UP-001 extend it avoided duplicate sign-up forms and duplicate password
  logic — decided during sprint planning, held up through implementation.
* Verifying against a second, disposable server instance (`PORT=3099`) rather than the
  human's long-running port-3000 process caught a real gap early (stale process silently
  200'ing unroutable paths via the SPA fallback) instead of producing a false pass.

## What to change
* `.env` (not `.env.example`) needed `SMTP_HOST`/`SMTP_PORT`/`APP_BASE_URL` added by hand
  mid-sprint — `.env.example` had documented them since SIGNUP-EXPEDITE-001, but nothing
  copied them over. Local env drift like this should be checked as part of picking up a
  story, not discovered mid-implementation.
* Migrations run automatically on server startup (`server/src/index.ts`) — a manual
  `npm run db:migrate` before starting the server is redundant and shouldn't be a
  habitual step in verification runs.

See `reference/do_and_donts.md` for the entries carried forward from this retrospective.
