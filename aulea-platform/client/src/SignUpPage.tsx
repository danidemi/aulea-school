import { useEffect, useState, type FormEvent } from 'react'
import { Button } from './components/ui/button'
import { Card } from './components/ui/card'
import { Input } from './components/ui/input'
import { Label } from './components/ui/label'
import AppHeader from './components/AppHeader'

/**
 * `/signup` screen. Email + password fields, scaffolded by
 * SIGNUP-EXPEDITE-001 alongside the "expedite sign up" option (shown only
 * once `GET /api/config` confirms the flag is on). The normal "Sign up"
 * submit is wired by SIGN-UP-001 to `POST /api/signup` — the confirmation-
 * email flow: the account is created unconfirmed, and a link is emailed.
 * Restyled by UI-FOUNDATION-001 (ADR-0006): the same header pattern as
 * `App.tsx`/`LoginPage.tsx`, and the form lives inside a `Card`.
 */
function SignUpPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [expediteEnabled, setExpediteEnabled] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/config')
      .then((res) => res.json())
      .then((config) => {
        if (!cancelled) setExpediteEnabled(Boolean(config.expediteSignupEnabled))
      })
      .catch(() => {
        // config fetch failing just keeps the expedite option hidden
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function handleSignUp(event: FormEvent) {
    event.preventDefault()
    setMessage(null)
    const response = await fetch('/api/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const body = await response.json()
    if (response.status === 201) {
      setMessage(`Account created for ${body.email}. Check your email for a confirmation link.`)
    } else {
      setMessage(`Sign up failed: ${body.error}`)
    }
  }

  async function handleExpediteSignUp() {
    setMessage(null)
    const response = await fetch('/api/signup/expedite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const body = await response.json()
    if (response.status === 201) {
      setMessage(`Account created for ${body.email}. Sign in separately — no session was started.`)
    } else {
      setMessage(`Sign up failed: ${body.error}`)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-paper">
      <AppHeader user={null} />
      <main className="flex flex-1 items-center justify-center px-6 py-section-gap">
        <Card className="w-full max-w-sm">
          <h1 className="mb-group-gap font-display text-2xl font-semibold text-ink">Create your account</h1>
          <form onSubmit={handleSignUp} className="flex flex-col gap-group-gap">
            <div>
              <Label htmlFor="signup-email">Email</Label>
              <Input
                id="signup-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="signup-password">Password</Label>
              <Input
                id="signup-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
            <Button type="submit">Sign up</Button>
            {expediteEnabled && (
              <Button type="button" variant="outline" onClick={handleExpediteSignUp}>
                Expedite sign up
              </Button>
            )}
          </form>
          {message && (
            <p role="status" className="mt-group-gap text-sm text-ink/80">
              {message}
            </p>
          )}
        </Card>
      </main>
    </div>
  )
}

export default SignUpPage
