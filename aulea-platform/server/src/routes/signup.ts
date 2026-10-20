import { createHash } from 'node:crypto'
import { Router } from 'express'
import { hashPassword } from '../auth/password.js'
import { generateToken, hashToken } from '../auth/tokens.js'
import { isUniqueViolation, type NewUser, type CreatedUser, type UserRepository } from '../db/users.js'
import type { ConfirmationTokenRepository } from '../db/confirmationTokens.js'
import type { ResendKey, ResendRequestRepository } from '../db/resendRequests.js'
import type { Mailer } from '../email/mailer.js'
import {
  appBaseUrl,
  resendCooldownSeconds,
  resendIpMaxPerHour,
  resendMaxPerDay,
  signupPendingMaxAgeDays,
} from '../config.js'

const MIN_PASSWORD_LENGTH = 8
const CONFIRMATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000
const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS

/**
 * Minimal shape check for the email field — the DoD only specifies the
 * password-length rule, so the email rule is the smallest one that keeps
 * a missing/blank email from reaching the insert as an unhandled 500:
 * non-empty and containing '@'. Recorded here rather than invented
 * silently, per SIGNUP-EXPEDITE-001's Technical plan.
 */
function isValidEmail(email: unknown): email is string {
  return typeof email === 'string' && email.trim().length > 0 && email.includes('@')
}

function isValidPassword(password: unknown): password is string {
  return typeof password === 'string' && password.length >= MIN_PASSWORD_LENGTH
}

function hashEmail(email: string): string {
  return createHash('sha256').update(email.trim().toLowerCase()).digest('hex')
}

/** Seconds from `now` until `at`, rounded up, never below 1 (a `Retry-After` value). */
function secondsUntil(at: number, now: number): number {
  return Math.max(1, Math.ceil((at - now) / 1000))
}

/**
 * `GET /api/config`, `POST /api/signup/resend` (RESEND-CONFIRMATION-001), `POST /api/signup/expedite` (SIGNUP-EXPEDITE-001), and
 * `POST /api/signup` / `GET /api/confirm` (SIGN-UP-001,
 * `active_sprint/story_sign_in_with_own_email.md`).
 *
 * The feature flag is read from `process.env` on every request, not
 * captured at module load — so a test can flip it per-request and the
 * "403 when the flag is off" case stays testable without a process
 * restart.
 */
export function createSignupRouter(
  users: UserRepository,
  confirmationTokens: ConfirmationTokenRepository,
  mailer: Mailer,
  resendRequests: ResendRequestRepository,
): Router {
  const router = Router()

  /**
   * SIGNUP-EXPIRY-001: creates the account; when the address is taken by an
   * unconfirmed account older than the maximum age, that account is purged
   * and the insert is retried once. Keeps the "unique violation gives 409"
   * design (no check-then-insert race): a second violation propagates and
   * the caller answers 409.
   */
  async function createReplacingExpired(user: NewUser): Promise<CreatedUser> {
    try {
      return await users.create(user)
    } catch (err) {
      if (!isUniqueViolation(err)) throw err
      const olderThan = new Date(Date.now() - signupPendingMaxAgeDays() * DAY_MS)
      const purged = await users.deleteExpiredPendingByEmail(user.email, olderThan)
      if (!purged) throw err
      return await users.create(user)
    }
  }

  /** Creates a 24 h token for the account and emails the link; resolves to the token's id. */
  async function issueConfirmationEmail(userId: string, to: string): Promise<string> {
    const rawToken = generateToken()
    const stored = await confirmationTokens.create({
      userId,
      tokenHash: hashToken(rawToken),
      expiresAt: new Date(Date.now() + CONFIRMATION_TOKEN_TTL_MS),
    })
    await mailer.sendConfirmationEmail(to, `${appBaseUrl()}/api/confirm?token=${rawToken}`)
    return stored.id
  }

  router.get('/api/config', (_req, res) => {
    res.status(200).json({
      expediteSignupEnabled: process.env.EXPEDITE_SIGNUP_ENABLED === 'true',
      // SIGNUP-EXPIRY-001 / RESEND-CONFIRMATION-001: the client texts and the
      // resend countdown read these, so they always match the server setting.
      pendingMaxAgeDays: signupPendingMaxAgeDays(),
      resendCooldownSeconds: resendCooldownSeconds(),
    })
  })

  router.post('/api/signup/expedite', async (req, res) => {
    if (process.env.EXPEDITE_SIGNUP_ENABLED !== 'true') {
      res.status(403).json({ error: 'feature_disabled' })
      return
    }

    const { email, password, passwordConfirmation } = req.body ?? {}

    if (!isValidEmail(email)) {
      res.status(400).json({ error: 'invalid_email' })
      return
    }

    if (!isValidPassword(password)) {
      res.status(400).json({ error: 'password_too_short' })
      return
    }

    // SIGNUP-002: checked after the length rule, before hashing/creating.
    if (passwordConfirmation !== password) {
      res.status(400).json({ error: 'password_mismatch' })
      return
    }

    try {
      const passwordHash = await hashPassword(password)
      const created = await createReplacingExpired({
        email,
        passwordHash,
        confirmedAt: new Date(),
      })
      res.status(201).json(created)
    } catch (err) {
      if (isUniqueViolation(err)) {
        res.status(409).json({ error: 'email_taken' })
        return
      }
      // Express 4 does not catch rejections from async handlers itself —
      // respond here rather than letting it hang/crash the process.
      console.error('signup/expedite failed:', err)
      res.status(500).json({ error: 'internal_error' })
    }
  })

  router.post('/api/signup', async (req, res) => {
    const { email, password, passwordConfirmation } = req.body ?? {}

    if (!isValidEmail(email)) {
      res.status(400).json({ error: 'invalid_email' })
      return
    }

    if (!isValidPassword(password)) {
      res.status(400).json({ error: 'password_too_short' })
      return
    }

    // SIGNUP-002: checked after the length rule, before hashing/creating.
    if (passwordConfirmation !== password) {
      res.status(400).json({ error: 'password_mismatch' })
      return
    }

    try {
      const passwordHash = await hashPassword(password)
      const created = await createReplacingExpired({
        email,
        passwordHash,
        // Unconfirmed until the emailed link is followed — unlike the
        // expedite path, which confirms immediately.
        confirmedAt: null,
      })

      await issueConfirmationEmail(created.id, created.email)

      res.status(201).json(created)
    } catch (err) {
      if (isUniqueViolation(err)) {
        res.status(409).json({ error: 'email_taken' })
        return
      }
      console.error('signup failed:', err)
      res.status(500).json({ error: 'internal_error' })
    }
  })

  /**
   * RESEND-CONFIRMATION-001. The limits (IP per hour, cooldown, cap per day)
   * are measured on rows in `resend_requests` and apply to the requested
   * address whether or not an account exists, so a 429 never reveals which
   * emails are registered. They are checked before the request is recorded:
   * a refused call leaves no row, so it neither extends the cooldown nor
   * uses up the daily cap.
   */
  router.post('/api/signup/resend', async (req, res) => {
    const { email } = req.body ?? {}

    if (!isValidEmail(email)) {
      res.status(400).json({ error: 'invalid_email' })
      return
    }

    try {
      const now = Date.now()
      const emailHash = hashEmail(email)
      const ip = req.ip ?? 'unknown'

      const checks: { key: ResendKey; windowMs: number; max: number; nextAt: 'oldest' | 'newest' }[] = [
        { key: { ip }, windowMs: HOUR_MS, max: resendIpMaxPerHour(), nextAt: 'oldest' },
        { key: { emailHash }, windowMs: resendCooldownSeconds() * 1000, max: 1, nextAt: 'newest' },
        { key: { emailHash }, windowMs: DAY_MS, max: resendMaxPerDay(), nextAt: 'oldest' },
      ]
      // Check and record in one atomic step (see `ResendRequestRepository.admit`).
      const retryAfter = await resendRequests.admit({ ip, emailHash }, async (log) => {
        let wait = 0
        for (const check of checks) {
          const window = await log.windowSince(check.key, new Date(now - check.windowMs))
          const anchor = check.nextAt === 'oldest' ? window.oldestAt : window.newestAt
          if (window.count >= check.max && anchor) {
            wait = Math.max(wait, secondsUntil(anchor.getTime() + check.windowMs, now))
          }
        }
        if (wait === 0) await log.record({ emailHash, ip })
        return wait
      })
      if (retryAfter > 0) {
        res.set('Retry-After', String(retryAfter)).status(429).json({ error: 'too_many_requests' })
        return
      }

      const user = await users.findByEmail(email)
      const expiredBefore = now - signupPendingMaxAgeDays() * DAY_MS
      // Unknown, confirmed and expired-pending accounts all get the plain 200
      // below, and no email: the reply must not tell them apart.
      if (user && !user.confirmedAt && user.createdAt.getTime() >= expiredBefore) {
        const newTokenId = await issueConfirmationEmail(user.id, user.email)
        await confirmationTokens.deleteUnusedForUser(user.id, newTokenId)
      }
      res.status(200).json({})
    } catch (err) {
      console.error('signup/resend failed:', err)
      res.status(500).json({ error: 'internal_error' })
    }
  })

  // AUTH-UX-001: redirects to the home page's `?status=` outcome instead
  // of the retired `/confirm-result` page — the home page renders the
  // same messages as a dismissible banner.
  router.get('/api/confirm', async (req, res) => {
    const token = req.query.token

    if (typeof token !== 'string' || token.length === 0) {
      res.redirect(302, `${appBaseUrl()}/?status=invalid`)
      return
    }

    try {
      const stored = await confirmationTokens.findByHash(hashToken(token))

      if (!stored) {
        res.redirect(302, `${appBaseUrl()}/?status=invalid`)
        return
      }
      if (stored.usedAt) {
        res.redirect(302, `${appBaseUrl()}/?status=used`)
        return
      }
      if (stored.expiresAt.getTime() < Date.now()) {
        res.redirect(302, `${appBaseUrl()}/?status=expired`)
        return
      }

      await users.confirmUser(stored.userId)
      await confirmationTokens.markUsed(stored.id)
      res.redirect(302, `${appBaseUrl()}/?status=ok`)
    } catch (err) {
      console.error('confirm failed:', err)
      res.redirect(302, `${appBaseUrl()}/?status=invalid`)
    }
  })

  return router
}
