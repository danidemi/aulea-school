ID: SIGN-UP-001

As:
a `unregistered user`

I want to:
sign up with my email and password, receive a confirmation email, and click a link to
confirm my account

So that:
I'm able to become a registered user without any social login

Definition of Done:
* duplicate email → 409; password < 8 chars → 400
* signup creates the `users` row with `confirmed_at` null and no session (same no-auto-login
  rule as SIGNUP-EXPEDITE-001)
* a confirmation email (via Mailpit locally) links to `{APP_BASE_URL}/confirm?token=...`,
  backed by a `confirmation_tokens` row expiring in 24h
* visiting a valid/unused link confirms the user and redirects to
  `/confirm-result?status=ok`; expired/used/invalid tokens redirect to the matching
  `?status=` variant, each rendering a distinct message

Implemented (sprint, 2026-08-21):
* `server/src/auth/tokens.ts` (raw token + SHA-256 hash, only the digest stored),
  `server/src/db/confirmationTokens.ts`, migration `0002_next_brother_voodoo.sql`,
  `server/src/email/mailer.ts` (nodemailer/Mailpit), `POST /api/signup`, `GET /api/confirm`
  (reusing SIGNUP-EXPEDITE-001's validation), `client/src/ConfirmResultPage.tsx`
* extends SIGNUP-EXPEDITE-001's `/signup` screen and `password.ts` rather than a second form
* 29/29 server tests, 14/14 client tests; manually verified end-to-end via Mailpit (ok / used /
  invalid / expired / duplicate-409 / short-password-400), including a real second server
  instance so the confirmation link didn't silently hit an unrelated already-running process
