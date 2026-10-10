import crypto from 'node:crypto'

/**
 * Confirmation-link tokens (SIGN-UP-001). The raw token goes into the
 * emailed link as-is; only `hashToken`'s digest is ever persisted (see
 * `server/src/db/confirmationTokens.ts`), so reading the database alone
 * doesn't yield a usable token.
 */

export function generateToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

export function hashToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex')
}
