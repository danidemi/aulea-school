ID: SIGNUP-CONFIRMATION-001

Status: READY

Priority: Medium

Effort: 3

As:
an `unregistered user`

I want to:
see a confirmation view after the sign up succeeds, in place of the sign up form

So that:
I cannot submit the form a second time. Today, after a successful sign up the form stays on screen, and pressing "Sign up" again shows `email_taken`.

Context (checked in the code, 2026-10-14):
* `POST /api/signup` creates an unconfirmed account and emails a link (valid 24 h, single use). `SignUpPage.tsx` only sets a status line under the form.
* `POST /api/signup/expedite` (feature flag) creates an already confirmed account and sends no email.
* `GET /api/confirm` already redirects to `/?status=ok|used|expired|invalid`, shown as a banner on the home page. A second click on the same link already gives `status=used`, which is the usual behavior on other sites. No change needed there.

Definition of Done:
* after a successful `POST /api/signup`, the sign up page replaces the form with a confirmation view: "Check your email" and the address the email was sent to (e.g. `a@b.it`), a note that the link is valid for 24 hours, and a link to the login page
* after a successful expedite sign up, the same area shows "Account created" with the link to the login page (no "check your email", because no email is sent)
* in both cases the form fields and both buttons are no longer in the page, so a second submit is impossible
* reloading the page shows the empty sign up form again (the confirmation view is not stored and is not a separate URL)
* a failed sign up (`email_taken`, validation errors) keeps the form and shows the error, as today
* the unit tests of `SignUpPage` (given / when / then) cover: form replaced after 201 on both paths; form kept on 409 and 400
* the Playwright signup e2e is updated: after sign up, the form is gone and the login link is visible
* existing unit and e2e suites stay green
* evidence attached under `assets/SIGNUP-CONFIRMATION-001/`: screenshots of the sign up page before submit and the confirmation view (light and dark mode)

Out of scope:
* "Resend confirmation email": see `RESEND-CONFIRMATION-001`, which builds on this view.
