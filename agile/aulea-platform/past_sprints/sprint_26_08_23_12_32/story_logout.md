ID: LOGOUT-001

As:
a `registered user` who is currently signed in (by any method)

I want to:
see a log-out button when I'm signed in, and click it to end my session

So that:
I can leave the platform on a shared device without staying signed in

Definition of Done:
* whenever a session exists, the header shows a log-out control instead of "Sign in"
* clicking it destroys the session server-side and clears the cookie; header returns to
  signed-out state; protected functionality behaves as `unregistered` afterward

Implemented (sprint, 2026-08-22):
* logout endpoint added to `server/src/routes/login.ts`; header control in `client/src/App.tsx`
* 39/39 server tests, 23/23 client tests
* manual verification against a disposable server: session row count actually dropped after
  logout (not just cookie cleared), `GET /api/me` 401 with the same cookie jar afterward,
  `Set-Cookie` expires the cookie
* same HTTP-level-only verification gap as AUTH-UX-001, later addressed by E2E-BROWSER-001
