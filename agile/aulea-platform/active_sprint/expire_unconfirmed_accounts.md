ID: SIGNUP-EXPIRY-001

Status: READY

Priority: Low

Effort: 3

Depends on: none. Interacts with `RESEND-CONFIRMATION-001` (see DoD).

As:
an `unregistered user` who signed up but never confirmed the email

I want to:
be able to sign up again with the same address once my pending registration is too old

So that:
a forgotten or mistyped registration does not block my email address forever. Today the address stays `email_taken` for good, and nobody can free it.

Product Owner idea (2026-10-14): delete a pending registration after a maximum age of three days.

Decision: it makes sense, with one correction. The user does not "log in again": an unconfirmed account cannot log in, so after the purge the user signs up again. It is also the usual practice, and it removes the "pre-registered a victim's email" problem at its root.

Context (checked in the code, 2026-10-14):
* an unconfirmed account has no `Tenant` yet (it is created at first login, and an unconfirmed user cannot log in), so a purge only touches `users` and `confirmation_tokens`
* the confirmation link already expires after 24 hours; the account row does not
* the server has no scheduler (no cron, no timer). ADR-0009 style "no background job" is the current habit.

Confirmed (Product Owner, 2026-10-18): maximum age 3 days from `users.created_at`, fixed, not extended by a resend, configurable with the env var `SIGNUP_PENDING_MAX_AGE_DAYS` (default 3). Purge happens lazily, when someone signs up with that address; no scheduler is added.

Definition of Done:
* an account is "expired pending" when `confirmed_at` is null and `created_at` is older than the maximum age (env var `SIGNUP_PENDING_MAX_AGE_DAYS`, default 3)
* `POST /api/signup` and `POST /api/signup/expedite` with the email of an expired pending account delete that account and its tokens, in one transaction, then create the new one and answer 201 as for a new address
* the same request for a pending account younger than the maximum age, or for a confirmed account, still answers `409 email_taken`
* a confirmation link of a purged account answers `status=invalid` (no 500)
* `POST /api/signup/resend` (`RESEND-CONFIRMATION-001`) sends nothing for an expired pending account and gives the same neutral reply as for an unknown email
* a confirmed account is never deleted, whatever its age
* the confirmation view tells the user the link lasts 24 hours and that the pending registration is dropped after the configured number of days (3 by default), so they know to sign up again
* unit tests, given / when / then: expired pending is replaced; young pending is `409`; confirmed is `409`; purge is all-or-nothing; old link answers `invalid`
* a Playwright e2e or repository test on real Postgres covers the replace-on-signup path
* existing unit and e2e suites stay green
* verified automatically; evidence is the log of the green runs, attached under `assets/SIGNUP-EXPIRY-001/`

Out of scope:
* a periodic cleanup of old rows that nobody tries to sign up again with. They do no harm; add a scheduler only if the table grows. Log a separate PBI then.

Implementation plan (sprint planning, 2026-10-18):
* Order: after `RESEND-CONFIRMATION-001` (same files: `signup.ts`, the resend route, `SignUpConfirmation`).
* Lazy purge, no scheduler (ADR-0009 habit). `UserRepository` gets `deleteExpiredPendingByEmail(email, olderThan: Date): Promise<boolean>`: in one transaction, delete the account's `confirmation_tokens`, then delete the `users` row where `email` matches, `confirmed_at IS NULL` and `created_at < olderThan`; return whether a row went. All or nothing. `resend_requests` rows are keyed by email hash, not by user, so they need no cleanup.
* Signup path: keep the "unique violation gives 409" design (no check-then-insert race). On `isUniqueViolation`, call `deleteExpiredPendingByEmail`; if it returned true, retry the insert once (a second violation gives 409). Same for `POST /api/signup/expedite`.
* Resend path: an expired pending account is treated as unknown (same neutral reply, nothing sent). The check is one repository lookup (`findByEmail` already returns `confirmedAt`; add `createdAt` to `UserForLogin`).
* Config: `signupPendingMaxAgeDays()` in `config.ts`, env `SIGNUP_PENDING_MAX_AGE_DAYS`, default 3, invalid values fall back to 3.
* Client: the 24 h note in `SignUpConfirmation` gets the 3-day sentence; the number comes from `GET /api/config` (`pendingMaxAgeDays`) so the text always matches the server setting. `SignUpPage` already reads `/api/config`.
* Confirmation link of a purged account: tokens are deleted, so `findByHash` gives null and the route already redirects to `status=invalid`; only a test is needed.
* Tests: unit with fakes (expired replaced, young 409, confirmed 409, purge failure leaves both rows), repository integration test on Testcontainers (ADR-0014) for the transaction, and a Playwright spec for replace-on-signup that ages the row by updating `created_at` directly in the e2e database.
* No migration. `db-seed.ts` unaffected unless it relies on the `email_taken` reply; check.
