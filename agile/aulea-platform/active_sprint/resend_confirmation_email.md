ID: RESEND-CONFIRMATION-001

Status: READY

Priority: Medium

Effort: 8

Depends on: `SIGNUP-CONFIRMATION-001` (the button lives on its confirmation view)

As:
an `unregistered user` who signed up but did not receive, or lost, the confirmation email

I want to:
ask for a new confirmation email

So that:
I can activate my account. Today I can neither log in (account unconfirmed) nor sign up again (`email_taken`).

Abuse rule (Product Owner, 2026-10-14): resend must not be usable to flood a mailbox or the mail service. The limit is enforced in the backend; the UI only mirrors it.

Context (checked in the code, 2026-10-14):
* `confirmation_tokens` already has `created_at`, so the time of the last email can be read from the newest token row. No migration is needed for a cooldown.
* no rate-limit library is in the server today.

Values (confirmed by the Product Owner, 2026-10-18), all configurable through env vars, these are the defaults:
* `RESEND_COOLDOWN_SECONDS` = 60: seconds between two sends for the same account
* `RESEND_MAX_PER_DAY` = 5: sends per account in 24 hours
* `RESEND_IP_MAX_PER_HOUR` = 20: resend requests per client IP in one hour
* a new link makes the older unused links of that account invalid

Decision on where resend lives (Product Owner, 2026-10-18): on the sign up page only, not on the login page. Conflict found: `SIGNUP-CONFIRMATION-001` keeps the confirmation view as component state, so a reload or a later visit shows the empty sign up form and the "Resend email" button is gone, just when a user who lost the email needs it. Resolution, as most sites do (a "Didn't get the email?" entry point that asks for the address):
* the confirmation view has the "Resend email" button (the address is known from the state)
* the sign up page form also has a link "Already signed up but no email? Resend it". It switches the same card to a small form with one email field and a "Resend email" button, and shows the same neutral reply and countdown. The login page is not changed.
* the confirmation view stays state only, as decided in `SIGNUP-CONFIRMATION-001`; no new route

Definition of Done:
* `POST /api/signup/resend` takes an email address. For an existing, unconfirmed account it creates a new token (24 h validity, same as sign up), invalidates the older unused tokens of that account, and sends the confirmation email.
* the backend refuses a resend inside the cooldown with `429` and a `Retry-After` header (seconds left), and sends no email and creates no token. The same applies after the 24 h cap is reached.
* the response does not reveal whether an email has an account: an unknown email and an already confirmed account both get the same success response as a real send, and no email is sent. (`email_taken` at sign up already reveals existence; this PBI does not make it worse.)
* the cooldown also counts per client IP, so one caller cannot probe many addresses quickly. The IP limit value is set at planning.
* the limits are measured by the server clock and survive a server restart (they derive from the database, not from memory).
* the three limits above are read from the env vars, with the stated defaults; a test overrides them
* on the confirmation view of `SIGNUP-CONFIRMATION-001` there is a "Resend email" button. After a click it is disabled and shows a visible countdown until the cooldown ends. A `429` reply puts the countdown back using `Retry-After`. Reloading the page does not bypass the limit, because the backend enforces it.
* the login page is not changed (it keeps its generic 401, which hides account state by design); resend is offered on the sign up page only: the confirmation view button, and the "Already signed up but no email?" link with its email form
* unit tests, given / when / then: resend sends a new email; second call inside the cooldown gets `429` and sends nothing; call after the cooldown works; 24 h cap; unknown email and confirmed account get the same reply as success; old link stops working after a resend; new link confirms the account.
* a Playwright e2e covers the button, the countdown and the `429` case against real Postgres, with a fake mailer
* existing unit and e2e suites stay green
* evidence attached under `assets/RESEND-CONFIRMATION-001/`: screenshots of the button enabled, disabled with countdown, the `429` message, and the "Already signed up" email form; log of the e2e run

Implementation plan (sprint planning, 2026-10-18):
* Two corrections to this PBI's own Context, found in the code:
  1. "No migration is needed" is wrong for the IP limit: `confirmation_tokens` has no client address, and a resend for an unknown email creates no token at all. A per-IP limit that survives a restart needs its own stored data.
  2. A `429` only for real unconfirmed accounts would reveal which emails exist, against the PBI's own rule. So the limits must apply to the requested address whether or not an account exists.
* Plan: new table `resend_requests` (`id`, `email_hash` = SHA-256 of the lower-cased email, `ip`, `created_at`, indexes on `(email_hash, created_at)` and `(ip, created_at)`), written for every call to `POST /api/signup/resend`. The cooldown (60 s) and the daily cap (5) count rows by `email_hash`; the IP cap (20 per hour) counts rows by `ip`. Same limits for known and unknown addresses, so the replies match. No raw email is stored for unknown addresses. Migration file: `0012_add_resend_requests.sql`, generated with `npx drizzle-kit generate --name add_resend_requests` (agile CLAUDE.md naming rule).
* Repository port `ResendRequestRepository` (`record`, `countSince` by email hash or ip, `lastAt`), narrow and interface-based like `ConfirmationTokenRepository`, with an in-memory fake for route tests and a Testcontainers integration test (ADR-0014) for the counting queries.
* `ConfirmationTokenRepository` gets `deleteUnusedForUser(userId)`: old unused links are deleted when a new one is issued, so an old link answers `status=invalid` (no new status needed).
* Config in `server/src/config.ts`, read per call like `appBaseUrl()`: `resendCooldownSeconds()` (60), `resendMaxPerDay()` (5), `resendIpMaxPerHour()` (20); invalid or missing env values fall back to the default. Documented in the README and `.env.example`.
* Client IP: `req.ip` is the proxy's address when the app runs behind a reverse proxy, which would make every caller share one IP limit. Add `TRUST_PROXY` (env, default unset = not trusted) mapped to Express `trust proxy`; the production compose example sets it. Needs the Product Owner to confirm the proxy hop count at deploy time (flag at review).
* Route in `signup.ts`: validate email (400), record the request, check IP, cooldown and daily cap (429 with `Retry-After` in whole seconds), then if the account exists and is unconfirmed, issue a token and send the email; otherwise answer the same 200 `{}`. A mail failure answers 500 and the request still counts.
* Client: `SignUpConfirmation` gets the button and the countdown (a small `useCountdown` hook, seconds from the first 200 = cooldown, from a 429 = `Retry-After`). `SignUpPage` gets the "Already signed up but no email? Resend it" link and the email-only `ResendForm` in the same `Card`. The login page is not touched.
* Interaction: `SIGNUP-EXPIRY-001` also edits `signup.ts` and the resend route. Build this PBI first; the expiry PBI then adds its expired-account check on top.
* UX pattern check (form replaced by a result view, rate-limit message): confined to `SignUpPage`; no other screen has them. No table involved.
* Seed: `db-seed.ts` is unaffected (no change to the entities it creates). Check that it does not call `/api/signup`; if it does, adapt.
* Evidence: Playwright with a stubbed or real fake mailer against Postgres, as in the DoD; screenshots of the four states.
