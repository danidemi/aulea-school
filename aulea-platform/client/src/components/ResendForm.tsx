import { useState, type FormEvent } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import ResendMessage from './ResendMessage'
import { useResendConfirmation } from '../lib/useResendConfirmation'

/**
 * RESEND-CONFIRMATION-001: the sign up page's "Already signed up but no
 * email?" form — one email field and a "Resend email" button, for a user who
 * reloaded or came back later, when the confirmation view (component state
 * only) is gone. Shows the same neutral reply and countdown as the button.
 */
function ResendForm({ cooldownSeconds, onBack }: { cooldownSeconds: number; onBack: () => void }) {
  const [email, setEmail] = useState('')
  const { resend, secondsLeft, message, sending } = useResendConfirmation(cooldownSeconds)

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    void resend(email)
  }

  return (
    <>
      <h1 className="mb-group-gap font-display text-2xl font-semibold text-ink">Resend the confirmation email</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-group-gap">
        <div>
          <Label htmlFor="resend-email">Email</Label>
          <Input id="resend-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        </div>
        <Button type="submit" disabled={sending || secondsLeft > 0 || email.trim() === ''}>
          {secondsLeft > 0 ? `Resend email (${secondsLeft}s)` : 'Resend email'}
        </Button>
        <ResendMessage message={message} secondsLeft={secondsLeft} />
      </form>
      <button type="button" onClick={onBack} className="mt-group-gap text-sm font-medium text-ink underline">
        Back to sign up
      </button>
    </>
  )
}

export default ResendForm
