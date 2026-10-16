import { Link } from 'react-router-dom'

export type SignUpOutcome = { kind: 'check-email' | 'created'; email: string }

/**
 * Result view shown by `SignUpPage` in place of the form once a sign up
 * succeeded (SIGNUP-CONFIRMATION-001). Plain component state, not a route.
 * Kept separate so RESEND-CONFIRMATION-001 can build on it.
 */
function SignUpConfirmation({ outcome }: { outcome: SignUpOutcome }) {
  const checkEmail = outcome.kind === 'check-email'
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
          <p className="text-sm text-ink/80">The link is valid for 24 hours.</p>
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
