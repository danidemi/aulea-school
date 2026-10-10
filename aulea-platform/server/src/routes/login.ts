import { Router, type RequestHandler } from 'express'
import 'express-session'
import { verifyPassword } from '../auth/password.js'
import type { UserRepository } from '../db/users.js'
import type { TenantRepository } from '../db/tenants.js'

// Augments express-session's SessionData so `req.session.userId`/etc. are
// typed, instead of `any`. AUTH-UX-001 introduced `userId`/`userEmail`;
// TENANT-001 adds `tenantId`/`tenantName`, set at the same point (login)
// rather than derived separately later.
declare module 'express-session' {
  interface SessionData {
    userId?: string
    userEmail?: string
    tenantId?: string
    tenantName?: string
  }
}

const GENERIC_LOGIN_ERROR = { error: 'invalid_credentials' } as const

/**
 * `POST /api/login`, `GET /api/me` (AUTH-UX-001), and `POST /api/logout`
 * (LOGOUT-001) — grouped in one router/file because all three read or
 * write the same session, not because they're one story's work.
 *
 * The three rejection cases in the DoD — unknown email, wrong password,
 * unconfirmed account — all return the same generic 401 body, so a client
 * can't use the response to enumerate which emails have an account or
 * which are still unconfirmed.
 *
 * `sessionMiddleware` is passed explicitly to each route below, not
 * mounted via `router.use` — this router is registered with `app.use()`
 * at the top level (no path prefix), so an unscoped `router.use` would run
 * on every request that reaches it, including ones matching no route here
 * (e.g. `GET /`, which falls through to the SPA static handler). `/healthz`,
 * the static/SPA fallback, and the signup/confirm routes stay untouched,
 * so the DB-free unit test suite (`app.test.ts`, `signup.test.ts`) stays
 * DB-free even though the real session store needs Postgres.
 */
export function createLoginRouter(users: UserRepository, tenants: TenantRepository, sessionMiddleware: RequestHandler): Router {
  const router = Router()

  router.post('/api/login', sessionMiddleware, async (req, res) => {
    const { email, password } = req.body ?? {}

    if (typeof email !== 'string' || typeof password !== 'string') {
      res.status(401).json(GENERIC_LOGIN_ERROR)
      return
    }

    try {
      const user = await users.findByEmail(email)

      if (!user || !user.passwordHash || !user.confirmedAt) {
        res.status(401).json(GENERIC_LOGIN_ERROR)
        return
      }

      const passwordMatches = await verifyPassword(password, user.passwordHash)
      if (!passwordMatches) {
        res.status(401).json(GENERIC_LOGIN_ERROR)
        return
      }

      // TENANT-001: "check whether I'm already associated with a tenant,
      // if not create one" — done at login, the point where we know a
      // registered user is becoming active, rather than at signup (which
      // may never lead to a session — SIGNUP-EXPEDITE-001/SIGN-UP-001
      // deliberately don't start one).
      const tenant = await tenants.ensureCurrentTenant(user.id, user.email)

      // Regenerate the session id on privilege change (signing in), so a
      // session id observed before login can't be reused to hijack the
      // now-signed-in session.
      req.session.regenerate((regenerateErr) => {
        if (regenerateErr) {
          console.error('login session regenerate failed:', regenerateErr)
          res.status(500).json({ error: 'internal_error' })
          return
        }

        req.session.userId = user.id
        req.session.userEmail = user.email
        req.session.tenantId = tenant.id
        req.session.tenantName = tenant.name
        req.session.save((saveErr) => {
          if (saveErr) {
            console.error('login session save failed:', saveErr)
            res.status(500).json({ error: 'internal_error' })
            return
          }
          res.status(200).json({ id: user.id, email: user.email })
        })
      })
    } catch (err) {
      console.error('login failed:', err)
      res.status(500).json({ error: 'internal_error' })
    }
  })

  // AUTH-UX-001: lets the header (and any other client code) ask "am I
  // signed in, and as whom" without re-deriving it from a cookie itself.
  // TENANT-001 adds the current tenant to the same response — the header
  // shows it "close to its avatar" (DoD), i.e. alongside this same email.
  router.get('/api/me', sessionMiddleware, (req, res) => {
    if (!req.session.userId || !req.session.userEmail) {
      res.status(401).json({ error: 'not_signed_in' })
      return
    }
    res.status(200).json({
      id: req.session.userId,
      email: req.session.userEmail,
      tenant:
        req.session.tenantId && req.session.tenantName
          ? { id: req.session.tenantId, name: req.session.tenantName }
          : null,
    })
  })

  // LOGOUT-001: destroys the session server-side (not just clearing the
  // client's cookie) so the session row is actually gone from the store —
  // a stolen cookie from before logout is worthless afterward. Idempotent:
  // logging out with no session already just confirms "signed out".
  router.post('/api/logout', sessionMiddleware, (req, res) => {
    if (!req.session.userId) {
      res.status(200).json({ ok: true })
      return
    }
    req.session.destroy((err) => {
      if (err) {
        console.error('logout failed:', err)
        res.status(500).json({ error: 'internal_error' })
        return
      }
      res.clearCookie('connect.sid')
      res.status(200).json({ ok: true })
    })
  })

  return router
}
