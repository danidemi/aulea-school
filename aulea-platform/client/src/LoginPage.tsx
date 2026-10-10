import { Card } from './components/ui/card'
import AppHeader from './components/AppHeader'
import SignInForm from './components/SignInForm'

/**
 * `/login` screen (AUTH-UX-001, restyled by UI-FOUNDATION-001 — ADR-0006).
 * Renders the shared `SignInForm` (HOME-LOGIN-001) — kept as its own
 * route (not removed) for any direct link/bookmark to it, alongside the
 * same form now also shown on the home page.
 */
function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col bg-paper">
      <AppHeader user={null} />
      <main className="flex flex-1 items-center justify-center px-6 py-section-gap">
        <Card className="w-full max-w-sm">
          <h1 className="mb-group-gap font-display text-2xl font-semibold text-ink">Sign in</h1>
          <SignInForm />
          <a href="/signup" className="mt-group-gap block text-center text-sm text-ink underline underline-offset-2 hover:text-brass">
            Don&apos;t have an account yet? Create one
          </a>
        </Card>
      </main>
    </div>
  )
}

export default LoginPage
