ID: SIGNUP-CONFIRMATION-001

Status: IN_REVIEW

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

Implementation plan (sprint planning, 2026-10-16):
* No new ADR. Stays within ADR-0006 (shadcn/ui `Card`, existing tokens).
* `SignUpPage.tsx`: replace the `message` string used for success with an `outcome` state:
  `{ kind: 'check-email' | 'created', email } | null`. When `outcome` is set, render the confirmation
  view inside the same `Card` instead of the `<form>`. Failure paths keep `message` and the form, as today.
* Confirmation view: `role="status"`, heading "Check your email" / "Account created", the address,
  the 24 h note (check-email only), and a link to `/login`.
* The view is plain component state: no route, no storage. A reload gives the empty form.
* Tests: update `SignUpPage.test.tsx` (given / when / then) for 201 on both paths, 409 and 400. Update
  `e2e/signup.spec.ts` (form gone, login link visible).
* UX pattern check (form replaced by a result view): `role="status"` appears only in `App.tsx` (the
  confirm banner) and `SignUpPage.tsx`. `LoginPage` navigates away on success and has no
  form-after-success state. No other screen is affected.
* Evidence: Playwright screenshots, taken during development. The app has no dark theme (the color
  scheme is pinned to light in `index.css`), so the "dark mode" shots use emulated
  `prefers-color-scheme: dark` and are expected to look the same as the light ones.
* `RESEND-CONFIRMATION-001` builds on this view; keep the view a separate small component to ease that.

Implemented (2026-10-16):
* New `client/src/components/SignUpConfirmation.tsx` (`role="status"`, "Check your email" / "Account created", address, 24 h note on check-email only, "Go to login" link to `/login`). `SignUpPage.tsx` holds an `outcome` state and renders it in place of the heading, form and status line. Failures keep `message` and the form.
* Tests: 4 new given / when / then cases in `SignUpPage.test.tsx` (201 on sign up, 201 on expedite, 409, 400). Playwright: `signup.spec.ts` asserts the form is gone and the login link is visible after expedite sign up; two new specs (light, dark) stub `POST /api/signup` (the e2e stack has no SMTP), check the "Check your email" view and that a reload shows the empty form.
* Verification: client vitest 115/115 green, `tsc -b` clean, full Playwright suite 15/15 green against the disposable Postgres and the built server on port 3100.
* Evidence (real Chromium): [form, light](assets/SIGNUP-CONFIRMATION-001/signup-form-light.png), [form, dark](assets/SIGNUP-CONFIRMATION-001/signup-form-dark.png), [check your email, light](assets/SIGNUP-CONFIRMATION-001/check-your-email-light.png), [check your email, dark](assets/SIGNUP-CONFIRMATION-001/check-your-email-dark.png). The app has no dark theme, so the dark shots equal the light ones. The "Account created" path is covered by the e2e spec and unit test, not by a screenshot.
* do_and_donts applied: real-browser screenshots attached; app run end-to-end on its own port with the built server; screens grepped for the same pattern (see plan); no manual `db:migrate`; tool availability checked live (Docker 29.4.0, Playwright 1.62.1).
* Note: the Playwright run prints a Node error dump from the server process after the tests finish ("terminating connection due to administrator command", pg client). It is the idle pg pool of the built server reacting to the e2e Postgres being torn down; it appears after all tests passed. Not changed here.
