import { useState, type FormEvent } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'

/**
 * Shared email/password sign-in form (HOME-LOGIN-001) — extracted out of
 * `LoginPage.tsx` so the home page (`App.tsx`) can show the same form
 * without duplicating its markup/`fetch` logic. Same behavior in both
 * places: on success, a full navigation to `/` (not client-side
 * routing) so `/api/me` re-runs against the freshly-issued session
 * cookie rather than relying on stale in-memory state.
 */
function SignInForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState<string | null>(null)

  async function handleLogin(event: FormEvent) {
    event.preventDefault()
    setMessage(null)
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    if (response.status === 200) {
      window.location.assign('/')
      return
    }
    const body = await response.json()
    setMessage(`Sign in failed: ${body.error}`)
  }

  return (
    <form onSubmit={handleLogin} className="flex flex-col gap-group-gap">
      <div>
        <Label htmlFor="login-email">Email</Label>
        <Input id="login-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
      </div>
      <div>
        <Label htmlFor="login-password">Password</Label>
        <Input
          id="login-password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </div>
      <Button type="submit">Sign in</Button>
      {message && (
        <p role="status" className="text-sm text-error">
          {message}
        </p>
      )}
    </form>
  )
}

export default SignInForm
