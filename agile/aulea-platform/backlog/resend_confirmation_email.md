ID: RESEND-CONFIRMATION-001

Status: DRAFT

Priority: Medium

Effort: 5

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

Proposed values (to confirm at planning): cooldown 60 seconds between two sends for the same account; at most 5 sends per account in 24 hours; a new link makes the older unused links of that account invalid.

Definition of Done:
* `POST /api/signup/resend` takes an email address. For an existing, unconfirmed account it creates a new token (24 h validity, same as sign up), invalidates the older unused tokens of that account, and sends the confirmation email.
* the backend refuses a resend inside the cooldown with `429` and a `Retry-After` header (seconds left), and sends no email and creates no token. The same applies after the 24 h cap is reached.
* the response does not reveal whether an email has an account: an unknown email and an already confirmed account both get the same success response as a real send, and no email is sent. (`email_taken` at sign up already reveals existence; this PBI does not make it worse.)
* the cooldown also counts per client IP, so one caller cannot probe many addresses quickly. The IP limit value is set at planning.
* the limits are measured by the server clock and survive a server restart (they derive from the database, not from memory).
* on the confirmation view of `SIGNUP-CONFIRMATION-001` there is a "Resend email" button. After a click it is disabled and shows a visible countdown until the cooldown ends. A `429` reply puts the countdown back using `Retry-After`. Reloading the page does not bypass the limit, because the backend enforces it.
* the login page keeps its generic 401 (it hides account state by design); resend is offered on the sign up confirmation view only (see the open question)
* unit tests, given / when / then: resend sends a new email; second call inside the cooldown gets `429` and sends nothing; call after the cooldown works; 24 h cap; unknown email and confirmed account get the same reply as success; old link stops working after a resend; new link confirms the account.
* a Playwright e2e covers the button, the countdown and the `429` case against real Postgres, with a fake mailer
* existing unit and e2e suites stay green
* evidence attached under `assets/RESEND-CONFIRMATION-001/`: screenshots of the button enabled, disabled with countdown, and the `429` message; log of the e2e run

Open question for the Product Owner:
* the login page cannot help a locked-out unconfirmed user because of the generic 401. Is "resend only from the sign up confirmation view" enough, or should a user who returns later be able to ask from the login page?
