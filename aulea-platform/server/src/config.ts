/**
 * The base URL for links meant to leave the browser/server and be opened
 * elsewhere — originally SIGN-UP-001's confirmation-link emails
 * (`{APP_BASE_URL}/api/confirm?token=...`), now also
 * QUIZ-SESSION-CONTROL-001's student-facing session URL (a QR code scanned
 * by a different device, which can't resolve a browser's own
 * `window.location.origin`). Deliberately not derived from request
 * context — decided during SIGN-UP-001's sprint planning (2026-08-21),
 * reaffirmed for the QR code case at QUIZ-SESSION-CONTROL-001's sprint
 * planning (2026-08-23, ADR-0008 revision).
 *
 * Read per-call, not captured at module load, so a test can set it
 * per-case.
 */
export function appBaseUrl(): string {
  return process.env.APP_BASE_URL ?? 'http://localhost:3000'
}

/**
 * Reads a positive integer from an env var, falling back to `fallback` when
 * it is missing, not a number, or not above zero. Read per call (like
 * `appBaseUrl`) so a test can override it per case.
 */
function positiveIntFromEnv(name: string, fallback: number): number {
  const parsed = Number(process.env[name])
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

/** RESEND-CONFIRMATION-001: seconds between two resends for the same address. */
export function resendCooldownSeconds(): number {
  return positiveIntFromEnv('RESEND_COOLDOWN_SECONDS', 60)
}

/** RESEND-CONFIRMATION-001: resends per address in 24 hours. */
export function resendMaxPerDay(): number {
  return positiveIntFromEnv('RESEND_MAX_PER_DAY', 5)
}

/** RESEND-CONFIRMATION-001: resend requests per client IP in one hour. */
export function resendIpMaxPerHour(): number {
  return positiveIntFromEnv('RESEND_IP_MAX_PER_HOUR', 20)
}

/** SIGNUP-EXPIRY-001: days after which an unconfirmed account is dropped on the next sign up. */
export function signupPendingMaxAgeDays(): number {
  return positiveIntFromEnv('SIGNUP_PENDING_MAX_AGE_DAYS', 3)
}
