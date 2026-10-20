import type { ResendMessage as Message } from '../lib/useResendConfirmation'

/** The outcome line under a "Resend email" control (RESEND-CONFIRMATION-001). */
function ResendMessage({ message, secondsLeft }: { message: Message | null; secondsLeft: number }) {
  if (!message) return null
  return (
    <p role={message.kind === 'sent' ? undefined : 'alert'} aria-live="polite" className="text-sm text-ink/80">
      {message.text}
      {message.kind === 'limited' && secondsLeft > 0 ? ` Try again in ${secondsLeft} seconds.` : ''}
    </p>
  )
}

export default ResendMessage
