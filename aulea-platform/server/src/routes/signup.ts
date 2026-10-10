import { Router } from 'express'
import { hashPassword } from '../auth/password.js'
import { generateToken, hashToken } from '../auth/tokens.js'
import { isUniqueViolation, type UserRepository } from '../db/users.js'
import type { ConfirmationTokenRepository } from '../db/confirmationTokens.js'
import type { Mailer } from '../email/mailer.js'
import { appBaseUrl } from '../config.js'

const MIN_PASSWORD_LENGTH = 8
const CONFIRMATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000

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

/**
 * `GET /api/config`, `POST /api/signup/expedite` (SIGNUP-EXPEDITE-001), and
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
): Router {
  const router = Router()

  router.get('/api/config', (_req, res) => {
    res.status(200).json({
      expediteSignupEnabled: process.env.EXPEDITE_SIGNUP_ENABLED === 'true',
    })
  })

  router.post('/api/signup/expedite', async (req, res) => {
    if (process.env.EXPEDITE_SIGNUP_ENABLED !== 'true') {
      res.status(403).json({ error: 'feature_disabled' })
      return
    }

    const { email, password } = req.body ?? {}

    if (!isValidEmail(email)) {
      res.status(400).json({ error: 'invalid_email' })
      return
    }

    if (!isValidPassword(password)) {
      res.status(400).json({ error: 'password_too_short' })
      return
    }

    try {
      const passwordHash = await hashPassword(password)
      const created = await users.create({
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
    const { email, password } = req.body ?? {}

    if (!isValidEmail(email)) {
      res.status(400).json({ error: 'invalid_email' })
      return
    }

    if (!isValidPassword(password)) {
      res.status(400).json({ error: 'password_too_short' })
      return
    }

    try {
      const passwordHash = await hashPassword(password)
      const created = await users.create({
        email,
        passwordHash,
        // Unconfirmed until the emailed link is followed — unlike the
        // expedite path, which confirms immediately.
        confirmedAt: null,
      })

      const rawToken = generateToken()
      await confirmationTokens.create({
        userId: created.id,
        tokenHash: hashToken(rawToken),
        expiresAt: new Date(Date.now() + CONFIRMATION_TOKEN_TTL_MS),
      })

      const confirmationLink = `${appBaseUrl()}/api/confirm?token=${rawToken}`
      await mailer.sendConfirmationEmail(created.email, confirmationLink)

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
