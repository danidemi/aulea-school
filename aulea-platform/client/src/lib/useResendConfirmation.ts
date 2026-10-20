import { useEffect, useState } from 'react'

export type ResendMessage = { kind: 'sent' | 'limited' | 'error'; text: string }

/**
 * RESEND-CONFIRMATION-001: state of one "Resend email" control, shared by the
 * confirmation view's button and the sign up page's email form. The backend
 * enforces the limits; this only mirrors them: after a send the control is
 * disabled for `cooldownSeconds` (from `GET /api/config`), and after a `429`
 * for the seconds in `Retry-After`. A reload loses the countdown but not the
 * limit, because the next click gets the `429` again.
 */
export function useResendConfirmation(cooldownSeconds: number) {
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [message, setMessage] = useState<ResendMessage | null>(null)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (secondsLeft <= 0) return
    const timer = setTimeout(() => setSecondsLeft((seconds) => seconds - 1), 1000)
    return () => clearTimeout(timer)
  }, [secondsLeft])

  async function resend(email: string) {
    setSending(true)
    setMessage(null)
    try {
      const response = await fetch('/api/signup/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (response.status === 200) {
        setSecondsLeft(cooldownSeconds)
        setMessage({
          kind: 'sent',
          text: 'If this address has a registration waiting for confirmation, a new email is on its way.',
        })
      } else if (response.status === 429) {
        const retryAfter = Number(response.headers.get('Retry-After'))
        const seconds = Number.isFinite(retryAfter) && retryAfter > 0 ? Math.ceil(retryAfter) : cooldownSeconds
        setSecondsLeft(seconds)
        setMessage({ kind: 'limited', text: 'Too many requests. Please wait before asking for another email.' })
      } else if (response.status === 400) {
        setMessage({ kind: 'error', text: 'Enter a valid email address.' })
      } else {
        setMessage({ kind: 'error', text: 'The email could not be sent. Try again later.' })
      }
    } catch {
      setMessage({ kind: 'error', text: 'The email could not be sent. Try again later.' })
    } finally {
      setSending(false)
    }
  }

  return { resend, secondsLeft, message, sending }
}
