ID: HOME-LOGIN-001

As:
an `unregistered/signed-out user`

I want to:
see the sign-in form directly on the home page, not just a "Sign in" button leading elsewhere

So that:
I can log in in one step instead of clicking through to `/login` first

Definition of Done:
* home page (`/`) shows the same email/password sign-in form `/login` shows, as one shared
  component (not duplicated markup/logic)
* `/login` still exists and works unchanged
* a signed-in user visiting `/` is redirected to `/courses` (no signed-in home content exists
  yet)

Implemented (sprint, 2026-08-23):
* extracted `client/src/components/SignInForm.tsx` out of `LoginPage.tsx`, rendered on both
  `/` and `/login`
* redirect uses `window.location.assign`, not `useNavigate` — `App.tsx` must keep rendering
  standalone with no `<Router>` ancestor in tests (ADR-0004), and a full navigation matches the
  pattern used elsewhere for session-cookie freshness after login
* 47/47 client tests (all pre-existing `/login` tests pass unmodified against the extracted
  component); `npm run build` clean
* manual browser verification not run this pass — tracked by E2E-BROWSER-001
