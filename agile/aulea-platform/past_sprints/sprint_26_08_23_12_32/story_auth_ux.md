ID: AUTH-UX-001

As:
an `unregistered user` or a `registered user` returning to the platform

I want to:
find sign-in from a standard navbar button, see all available sign-in methods on one sign-in
page, get to sign-up from a link, and land back on the home page once confirmed

So that:
signing in/up feels familiar instead of requiring a known `/signup` URL, and I'm not stranded
on a bare status page after confirming

Definition of Done:
* header "Sign in" button → `/login`, listing email+password sign-in (Google/LOGIN-001 stays
  out); a "Don't have an account? Create one" link to `/signup`
* `/signup` hosts both expedite and classical sign-up (already built) presented together
* `POST /api/login` checks email+password, creates a session (cookie via `express-session` +
  `connect-pg-simple`, Postgres-backed); rejects with a generic error for unknown
  email/wrong password/unconfirmed account — absorbs former LOGIN-EMAIL-001 scope
* no rate limiting/lockout on failed logins (explicit non-goal for now)
* confirmation link redirects to home with a dismissible confirmed/expired/used/invalid
  banner; `/confirm-result` retired
* once signed in, header reflects signed-in state (sign-out itself is LOGOUT-001's job)

Implemented (sprint, 2026-08-22):
* `server/src/routes/login.ts` (`POST /api/login`, `GET /api/me`), `express-session` +
  `connect-pg-simple` wired into `server/` for the first time, `client/src/LoginPage.tsx`
* 36/36 server tests, 21/21 client tests
* manual verification via a disposable server instance: wrong-password/unknown-email both 401
  with the same body, right password 200 + `Set-Cookie`, `GET /api/me` 401/200 correctly,
  session row confirmed in Postgres (not just in-memory), confirm redirect goes to `/?status=ok`
* gap: verification was HTTP-level (curl following redirects), not an actual browser
  click-through — flagged for sprint review, later addressed by E2E-BROWSER-001
