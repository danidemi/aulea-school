import { useEffect, useState } from 'react'
import { Button } from './components/ui/button'
import { Card } from './components/ui/card'
import AppHeader from './components/AppHeader'
import SignInForm from './components/SignInForm'
import { useSignedInUser } from './lib/session'

/**
 * Messages for the `?status=` outcome `GET /api/confirm` redirects here
 * with (AUTH-UX-001 — previously rendered on the now-retired
 * `/confirm-result` page). An unrecognized/missing status falls back to
 * the `invalid` message rather than rendering nothing.
 */
const CONFIRM_MESSAGES: Record<string, string> = {
  ok: 'Your account is confirmed. You can sign in now.',
  expired: 'This confirmation link has expired. Please sign up again to get a new one.',
  used: 'This confirmation link has already been used.',
  invalid: 'This confirmation link is not valid.',
}

/**
 * UI-FOUNDATION-001: the confirm banner uses the success/error tokens
 * (tailwind.config.js) — `ok` reads as success, everything else as an
 * error state, matching how the platform elsewhere signals outcomes.
 */
const CONFIRM_TONE: Record<string, 'success' | 'error'> = {
  ok: 'success',
  expired: 'error',
  used: 'error',
  invalid: 'error',
}

/**
 * Home page (HOME-001, restructured by AUTH-UX-001/LOGOUT-001/TENANT-001,
 * restyled by UI-FOUNDATION-001): reachable without signing in. The header
 * (`AppHeader`, shared with `CourseDashboardPage`) shows either a
 * "Sign in" link (unregistered) or the signed-in user's current tenant and
 * email plus a "Log out" control (once `GET /api/me` confirms a session
 * exists) — TENANT-001's "visualizes its current tenant close to its
 * avatar", `user.email` standing in for the avatar until one exists.
 *
 * HOME-LOGIN-001: signed-out visitors see the shared `SignInForm` here
 * directly, not just a link to `/login` — one click saved. A signed-in
 * visitor is redirected to `/courses` (no signed-in home/dashboard exists
 * yet; building one is future scope).
 */
function App() {
  const { user, logout } = useSignedInUser()
  const [confirmStatus, setConfirmStatus] = useState<string | null>(() =>
    new URLSearchParams(window.location.search).get('status'),
  )

  const tone = confirmStatus ? CONFIRM_TONE[confirmStatus] ?? 'error' : null

  // HOME-LOGIN-001: a signed-in user visiting `/` has nothing to do on
  // this signed-out landing page (no signed-in home/dashboard exists
  // yet) — send them to `/courses` instead. A full navigation, not
  // client-side routing: `App.tsx` stays a plain, router-ancestor-free
  // component (ADR-0004), same reasoning as `SignInForm`'s post-login
  // redirect.
  useEffect(() => {
    if (user) window.location.assign('/courses')
  }, [user])

  return (
    <div className="min-h-screen flex flex-col bg-paper">
      <AppHeader user={user} onLogout={logout} />

      {confirmStatus && (
        <div
          role="status"
          className={
            tone === 'success'
              ? 'flex items-center justify-between gap-group-gap border-b border-success/30 bg-success-50 px-6 py-3 text-sm text-success'
              : 'flex items-center justify-between gap-group-gap border-b border-error/30 bg-error-50 px-6 py-3 text-sm text-error'
          }
        >
          <span>{CONFIRM_MESSAGES[confirmStatus] ?? CONFIRM_MESSAGES.invalid}</span>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => setConfirmStatus(null)}
            className="text-lg leading-none opacity-70 hover:opacity-100"
          >
            ×
          </button>
        </div>
      )}

      <main className="flex flex-1 flex-col items-center justify-center gap-group-gap px-6 py-section-gap text-center">
        <h1 className="font-display text-3xl font-semibold text-ink">Plan courses. Author quizzes. Teach with confidence.</h1>
        <p className="max-w-md text-base text-ink/70">
          The Learning Platform helps trainers build and manage adult-education courses from
          one place.
        </p>
        {!user && (
          <>
            <Card className="w-full max-w-sm text-left">
              <h2 className="mb-group-gap font-display text-xl font-semibold text-ink">Sign in</h2>
              <SignInForm />
            </Card>
            <Button asChild variant="outline" className="mt-2">
              <a href="/signup">Sign up</a>
            </Button>
          </>
        )}
      </main>
    </div>
  )
}

export default App
