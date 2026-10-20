import { Link } from 'react-router-dom'
import { Button } from './ui/button'
import ResendMessage from './ResendMessage'
import { useResendConfirmation } from '../lib/useResendConfirmation'

export type SignUpOutcome = { kind: 'check-email' | 'created'; email: string }

/**
 * Result view shown by `SignUpPage` in place of the form once a sign up
 * succeeded (SIGNUP-CONFIRMATION-001). Plain component state, not a route.
 * RESEND-CONFIRMATION-001 adds the "Resend email" button with its countdown;
 * SIGNUP-EXPIRY-001 adds the note that a pending registration is dropped
 * after `pendingMaxAgeDays`, both numbers from `GET /api/config`.
 */
function SignUpConfirmation({
  outcome,
  pendingMaxAgeDays,
  resendCooldownSeconds,
}: {
  outcome: SignUpOutcome
  pendingMaxAgeDays: number
  resendCooldownSeconds: number
}) {
  const checkEmail = outcome.kind === 'check-email'
  const { resend, secondsLeft, message, sending } = useResendConfirmation(resendCooldownSeconds)
  return (
    <div role="status" className="flex flex-col gap-group-gap">
      <h1 className="font-display text-2xl font-semibold text-ink">
        {checkEmail ? 'Check your email' : 'Account created'}
      </h1>
      {checkEmail ? (
        <>
          <p className="text-sm text-ink/80">
            We sent a confirmation link to <strong className="break-all">{outcome.email}</strong>.
          </p>
          <p className="text-sm text-ink/80">
            The link is valid for 24 hours. If you do not confirm within {pendingMaxAgeDays}{' '}
            {pendingMaxAgeDays === 1 ? 'day' : 'days'}, the registration is dropped and you can sign up again.
          </p>
          <Button type="button" variant="outline" disabled={sending || secondsLeft > 0} onClick={() => void resend(outcome.email)}>
            {secondsLeft > 0 ? `Resend email (${secondsLeft}s)` : 'Resend email'}
          </Button>
          <ResendMessage message={message} secondsLeft={secondsLeft} />
        </>
      ) : (
        <p className="text-sm text-ink/80">
          The account for <strong className="break-all">{outcome.email}</strong> is ready. No session was started.
        </p>
      )}
      <Link to="/login" className="text-sm font-medium text-ink underline">
        Go to login
      </Link>
    </div>
  )
}

export default SignUpConfirmation
