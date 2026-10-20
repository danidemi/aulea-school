import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import request from 'supertest'
import { createApp } from '../app.js'
import type { CreatedUser, NewUser, UserRepository } from '../db/users.js'
import { UNIQUE_VIOLATION } from '../db/users.js'
import type { ConfirmationTokenRepository, NewConfirmationToken, StoredConfirmationToken } from '../db/confirmationTokens.js'
import type { ResendKey, ResendLog, ResendRequestRepository } from '../db/resendRequests.js'
import type { Mailer } from '../email/mailer.js'

/**
 * In-memory fake for the signup routes' tests — keeps this suite DB-free,
 * per server/src/db/client.ts's comment that the unit test suite must not
 * touch Postgres. Throws the same shape `drizzle-orm/node-postgres`
 * actually throws on a unique violation — the SQLSTATE code nested on
 * `.cause.code`, not `.code` directly (confirmed against a real Postgres
 * during SIGNUP-EXPEDITE-001 development: `isUniqueViolation` originally
 * checked only `.code` and silently 500'd on a real duplicate email while
 * this fake — throwing the flat shape — still made the 409 test pass).
 */
type FakeUserRow = CreatedUser & { passwordHash: string; confirmedAt: Date | null; createdAt: Date }

function createFakeUserRepository(
  confirmationTokens?: ConfirmationTokenRepository & { rows: (StoredConfirmationToken & { tokenHash: string })[] },
): UserRepository & {
  rows: FakeUserRow[]
  failPurge: boolean
} {
  const rows: FakeUserRow[] = []
  let nextId = 1

  return {
    rows,
    failPurge: false,
    async create(user: NewUser) {
      if (rows.some((row) => row.email === user.email)) {
        throw Object.assign(new Error('duplicate key value violates unique constraint'), {
          cause: { code: UNIQUE_VIOLATION },
        })
      }
      const created = { id: String(nextId++), email: user.email, passwordHash: user.passwordHash, confirmedAt: user.confirmedAt, createdAt: new Date() }
      rows.push(created)
      return { id: created.id, email: created.email }
    },
    async confirmUser(userId: string) {
      const row = rows.find((row) => row.id === userId)
      if (row) row.confirmedAt = new Date()
    },
    async findByEmail(email: string) {
      return rows.find((row) => row.email === email) ?? null
    },
    // All or nothing, like the real transaction: when `failPurge` is set it throws before touching either collection.
    async deleteExpiredPendingByEmail(email: string, olderThan: Date) {
      if (this.failPurge) throw new Error('purge failed')
      const index = rows.findIndex((row) => row.email === email && row.confirmedAt === null && row.createdAt < olderThan)
      if (index === -1) return false
      const [removed] = rows.splice(index, 1)
      if (confirmationTokens) {
        for (let i = confirmationTokens.rows.length - 1; i >= 0; i--) {
          if (confirmationTokens.rows[i].userId === removed.id) confirmationTokens.rows.splice(i, 1)
        }
      }
      return true
    },
  }
}

/** In-memory fake for the confirmation-tokens store (SIGN-UP-001). */
function createFakeConfirmationTokenRepository(): ConfirmationTokenRepository & { rows: (StoredConfirmationToken & { tokenHash: string })[] } {
  const rows: (StoredConfirmationToken & { tokenHash: string })[] = []
  let nextId = 1

  return {
    rows,
    async create(token: NewConfirmationToken) {
      const id = String(nextId++)
      rows.push({
        id,
        userId: token.userId,
        tokenHash: token.tokenHash,
        expiresAt: token.expiresAt,
        usedAt: null,
      })
      return { id }
    },
    async findByHash(tokenHash: string) {
      return rows.find((row) => row.tokenHash === tokenHash) ?? null
    },
    async markUsed(id: string) {
      const row = rows.find((row) => row.id === id)
      if (row) row.usedAt = new Date()
    },
    async deleteUnusedForUser(userId: string, exceptId: string) {
      for (let i = rows.length - 1; i >= 0; i--) {
        if (rows[i].userId === userId && rows[i].usedAt === null && rows[i].id !== exceptId) rows.splice(i, 1)
      }
    },
  }
}

/** In-memory fake for the resend limits' request log (RESEND-CONFIRMATION-001). */
function createFakeResendRequestRepository(): ResendRequestRepository & {
  rows: { emailHash: string; ip: string; createdAt: Date }[]
} {
  const rows: { emailHash: string; ip: string; createdAt: Date }[] = []
  const log: ResendLog = {
    async record(request) {
      rows.push({ ...request, createdAt: new Date() })
    },
    async windowSince(key: ResendKey, since: Date) {
      const inWindow = rows.filter(
        (row) => ('emailHash' in key ? row.emailHash === key.emailHash : row.ip === key.ip) && row.createdAt >= since,
      )
      const times = inWindow.map((row) => row.createdAt.getTime())
      return {
        count: inWindow.length,
        oldestAt: times.length ? new Date(Math.min(...times)) : null,
        newestAt: times.length ? new Date(Math.max(...times)) : null,
      }
    },
  }
  // Single-threaded: nothing interleaves inside `fn`, so running it directly is atomic enough here.
  return { rows, admit: (_caller, fn) => fn(log) }
}

/** In-memory fake mailer (SIGN-UP-001) — records sent mail instead of using SMTP. */
function createFakeMailer(): Mailer & { sent: { to: string; confirmationLink: string }[] } {
  const sent: { to: string; confirmationLink: string }[] = []
  return {
    sent,
    async sendConfirmationEmail(to: string, confirmationLink: string) {
      sent.push({ to, confirmationLink })
    },
  }
}

function createTestApp(overrides?: {
  users?: UserRepository
  confirmationTokens?: ConfirmationTokenRepository
  resendRequests?: ResendRequestRepository
  mailer?: Mailer
}) {
  return createApp({
    users: overrides?.users ?? createFakeUserRepository(),
    confirmationTokens: overrides?.confirmationTokens ?? createFakeConfirmationTokenRepository(),
    resendRequests: overrides?.resendRequests ?? createFakeResendRequestRepository(),
    mailer: overrides?.mailer ?? createFakeMailer(),
  })
}

describe('POST /api/signup/expedite (SIGNUP-EXPEDITE-001)', () => {
  const originalFlag = process.env.EXPEDITE_SIGNUP_ENABLED

  beforeEach(() => {
    process.env.EXPEDITE_SIGNUP_ENABLED = 'true'
  })

  afterEach(() => {
    process.env.EXPEDITE_SIGNUP_ENABLED = originalFlag
  })

  it('creates the account and returns 201 when the flag is on and input is valid', async () => {
    // given: the expedite flag is on and a fresh email/password
    const users = createFakeUserRepository()
    const app = createTestApp({ users })

    // when: signing up
    const response = await request(app)
      .post('/api/signup/expedite')
      .send({ email: 'dev@example.com', password: 'longenough', passwordConfirmation: 'longenough' })

    // then: the account is created
    expect(response.status).toBe(201)
    expect(response.body).toEqual({ id: '1', email: 'dev@example.com' })
    expect(response.headers['set-cookie']).toBeUndefined()
  })

  it('returns 403 when the feature flag is off, even with valid input', async () => {
    // given: the expedite flag is off
    process.env.EXPEDITE_SIGNUP_ENABLED = 'false'
    const app = createTestApp({ users: createFakeUserRepository() })

    // when: signing up anyway
    const response = await request(app)
      .post('/api/signup/expedite')
      .send({ email: 'dev@example.com', password: 'longenough', passwordConfirmation: 'longenough' })

    // then: it is rejected regardless of what the client sends
    expect(response.status).toBe(403)
    expect(response.body).toEqual({ error: 'feature_disabled' })
  })

  it('returns 409 when the email is already taken', async () => {
    // given: an email that already has an account
    const users = createFakeUserRepository()
    const app = createTestApp({ users })
    await request(app).post('/api/signup/expedite').send({ email: 'dev@example.com', password: 'longenough', passwordConfirmation: 'longenough' })

    // when: signing up again with the same email
    const response = await request(app)
      .post('/api/signup/expedite')
      .send({ email: 'dev@example.com', password: 'anotherlongone', passwordConfirmation: 'anotherlongone' })

    // then: it is rejected as a duplicate
    expect(response.status).toBe(409)
    expect(response.body).toEqual({ error: 'email_taken' })
  })

  it('returns 400 password_mismatch and creates no account when the confirmation differs or is missing', async () => {
    // given: no account exists yet
    const users = createFakeUserRepository()
    const app = createTestApp({ users })

    // when: the confirmation differs, then is omitted
    const differs = await request(app)
      .post('/api/signup/expedite')
      .send({ email: 'dev@example.com', password: 'longenough', passwordConfirmation: 'different1' })
    const missing = await request(app).post('/api/signup/expedite').send({ email: 'dev@example.com', password: 'longenough' })

    // then: both are rejected and nothing is stored
    expect(differs.status).toBe(400)
    expect(differs.body).toEqual({ error: 'password_mismatch' })
    expect(missing.status).toBe(400)
    expect(missing.body).toEqual({ error: 'password_mismatch' })
    expect(users.rows).toHaveLength(0)
  })

  it('returns 400 when the password is shorter than 8 characters', async () => {
    // given: a password under the minimum length
    const app = createTestApp({ users: createFakeUserRepository() })

    // when: signing up
    const response = await request(app)
      .post('/api/signup/expedite')
      .send({ email: 'dev@example.com', password: 'short7x', passwordConfirmation: 'short7x' })

    // then: it is rejected
    expect(response.status).toBe(400)
    expect(response.body).toEqual({ error: 'password_too_short' })
  })

  it('returns 400 when the email is missing', async () => {
    // given: no email in the request body
    const app = createTestApp({ users: createFakeUserRepository() })

    // when: signing up
    const response = await request(app).post('/api/signup/expedite').send({ password: 'longenough', passwordConfirmation: 'longenough' })

    // then: it is rejected rather than reaching the insert
    expect(response.status).toBe(400)
    expect(response.body).toEqual({ error: 'invalid_email' })
  })
})

describe('GET /api/config (SIGNUP-EXPEDITE-001)', () => {
  const originalFlag = process.env.EXPEDITE_SIGNUP_ENABLED

  afterEach(() => {
    process.env.EXPEDITE_SIGNUP_ENABLED = originalFlag
  })

  it('reports the expedite flag as enabled when EXPEDITE_SIGNUP_ENABLED=true', async () => {
    // given: the env var is set to true
    process.env.EXPEDITE_SIGNUP_ENABLED = 'true'
    const app = createTestApp({ users: createFakeUserRepository() })

    // when: the client fetches config on load
    const response = await request(app).get('/api/config')

    // then: it reflects the flag
    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({ expediteSignupEnabled: true })
  })

  it('reports the expedite flag as disabled when the env var is unset', async () => {
    // given: the env var is not set
    delete process.env.EXPEDITE_SIGNUP_ENABLED
    const app = createTestApp({ users: createFakeUserRepository() })

    // when: the client fetches config on load
    const response = await request(app).get('/api/config')

    // then: it defaults to off
    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({ expediteSignupEnabled: false })
  })

  it('reports the pending max age and the resend cooldown, from env with defaults (SIGNUP-EXPIRY-001, RESEND-CONFIRMATION-001)', async () => {
    // given: nothing set, then both env vars overridden (one of them invalid)
    delete process.env.SIGNUP_PENDING_MAX_AGE_DAYS
    delete process.env.RESEND_COOLDOWN_SECONDS
    const app = createTestApp()

    // when: the client fetches config
    const defaults = await request(app).get('/api/config')
    process.env.SIGNUP_PENDING_MAX_AGE_DAYS = '7'
    process.env.RESEND_COOLDOWN_SECONDS = 'abc'
    const overridden = await request(app).get('/api/config')
    delete process.env.SIGNUP_PENDING_MAX_AGE_DAYS
    delete process.env.RESEND_COOLDOWN_SECONDS

    // then: defaults are 3 days / 60 s; a valid value is used, an invalid one falls back
    expect(defaults.body).toMatchObject({ pendingMaxAgeDays: 3, resendCooldownSeconds: 60 })
    expect(overridden.body).toMatchObject({ pendingMaxAgeDays: 7, resendCooldownSeconds: 60 })
  })
})

describe('POST /api/signup (SIGN-UP-001)', () => {
  it('creates an unconfirmed account, stores a token, and sends a confirmation email', async () => {
    // given: a fresh email/password
    const users = createFakeUserRepository()
    const confirmationTokens = createFakeConfirmationTokenRepository()
    const mailer = createFakeMailer()
    const app = createTestApp({ users, confirmationTokens, mailer })

    // when: signing up
    const response = await request(app)
      .post('/api/signup')
      .send({ email: 'newuser@example.com', password: 'longenough', passwordConfirmation: 'longenough' })

    // then: the account is created, unconfirmed, no session started
    expect(response.status).toBe(201)
    expect(response.body).toEqual({ id: '1', email: 'newuser@example.com' })
    expect(response.headers['set-cookie']).toBeUndefined()
    expect(users.rows[0].confirmedAt).toBeNull()

    // and: a confirmation token was stored, and an email was sent with a matching link
    expect(confirmationTokens.rows).toHaveLength(1)
    expect(confirmationTokens.rows[0].userId).toBe('1')
    expect(mailer.sent).toHaveLength(1)
    expect(mailer.sent[0].to).toBe('newuser@example.com')
    expect(mailer.sent[0].confirmationLink).toContain('/api/confirm?token=')
  })

  it('returns 409 when the email is already taken', async () => {
    // given: an email that already has an account
    const users = createFakeUserRepository()
    const app = createTestApp({ users })
    await request(app).post('/api/signup').send({ email: 'dup@example.com', password: 'longenough', passwordConfirmation: 'longenough' })

    // when: signing up again with the same email
    const response = await request(app).post('/api/signup').send({ email: 'dup@example.com', password: 'anotherlongone', passwordConfirmation: 'anotherlongone' })

    // then: it is rejected as a duplicate
    expect(response.status).toBe(409)
    expect(response.body).toEqual({ error: 'email_taken' })
  })

  it('returns 400 password_mismatch and creates no account when the confirmation differs or is missing', async () => {
    // given: no account exists yet
    const users = createFakeUserRepository()
    const app = createTestApp({ users })

    // when: the confirmation differs, then is omitted
    const differs = await request(app)
      .post('/api/signup')
      .send({ email: 'dev@example.com', password: 'longenough', passwordConfirmation: 'different1' })
    const missing = await request(app).post('/api/signup').send({ email: 'dev@example.com', password: 'longenough' })

    // then: both are rejected and nothing is stored
    expect(differs.status).toBe(400)
    expect(differs.body).toEqual({ error: 'password_mismatch' })
    expect(missing.status).toBe(400)
    expect(missing.body).toEqual({ error: 'password_mismatch' })
    expect(users.rows).toHaveLength(0)
  })

  it('returns 400 when the password is shorter than 8 characters', async () => {
    // given: a password under the minimum length
    const app = createTestApp()

    // when: signing up
    const response = await request(app).post('/api/signup').send({ email: 'dev@example.com', password: 'short7x', passwordConfirmation: 'short7x' })

    // then: it is rejected
    expect(response.status).toBe(400)
    expect(response.body).toEqual({ error: 'password_too_short' })
  })

  it('returns 400 when the email is missing', async () => {
    // given: no email in the request body
    const app = createTestApp()

    // when: signing up
    const response = await request(app).post('/api/signup').send({ password: 'longenough', passwordConfirmation: 'longenough' })

    // then: it is rejected rather than reaching the insert
    expect(response.status).toBe(400)
    expect(response.body).toEqual({ error: 'invalid_email' })
  })
})

describe('GET /api/confirm (SIGN-UP-001)', () => {
  async function signUp(app: ReturnType<typeof createTestApp>, email: string) {
    await request(app).post('/api/signup').send({ email, password: 'longenough', passwordConfirmation: 'longenough' })
  }

  it('confirms the account and redirects to status=ok for a valid, unused token', async () => {
    // given: a signed-up, unconfirmed user with a valid confirmation link
    const users = createFakeUserRepository()
    const confirmationTokens = createFakeConfirmationTokenRepository()
    const mailer = createFakeMailer()
    const app = createTestApp({ users, confirmationTokens, mailer })
    await signUp(app, 'confirmme@example.com')
    const link = new URL(mailer.sent[0].confirmationLink)
    const token = link.searchParams.get('token')

    // when: the link is visited
    const response = await request(app).get(`/api/confirm?token=${token}`)

    // then: it redirects to the ok result, and the user is confirmed
    expect(response.status).toBe(302)
    expect(response.headers.location).toBe('http://localhost:3000/?status=ok')
    expect(users.rows[0].confirmedAt).not.toBeNull()
  })

  it('redirects to status=used when the link has already been visited', async () => {
    // given: a confirmation link that has already been used once
    const mailer = createFakeMailer()
    const app = createTestApp({ mailer })
    await signUp(app, 'reused@example.com')
    const token = new URL(mailer.sent[0].confirmationLink).searchParams.get('token')
    await request(app).get(`/api/confirm?token=${token}`)

    // when: the same link is visited again
    const response = await request(app).get(`/api/confirm?token=${token}`)

    // then: it redirects to the used result
    expect(response.headers.location).toBe('http://localhost:3000/?status=used')
  })

  it('redirects to status=expired when the token has expired', async () => {
    // given: a confirmation token whose expiry is in the past
    const confirmationTokens = createFakeConfirmationTokenRepository()
    const mailer = createFakeMailer()
    const app = createTestApp({ confirmationTokens, mailer })
    await signUp(app, 'expired@example.com')
    confirmationTokens.rows[0].expiresAt = new Date(Date.now() - 1000)
    const token = new URL(mailer.sent[0].confirmationLink).searchParams.get('token')

    // when: the link is visited
    const response = await request(app).get(`/api/confirm?token=${token}`)

    // then: it redirects to the expired result
    expect(response.headers.location).toBe('http://localhost:3000/?status=expired')
  })

  it('redirects to status=invalid for an unrecognized token', async () => {
    // given: a token that was never issued
    const app = createTestApp()

    // when: the link is visited
    const response = await request(app).get('/api/confirm?token=not-a-real-token')

    // then: it redirects to the invalid result
    expect(response.headers.location).toBe('http://localhost:3000/?status=invalid')
  })

  it('redirects to status=invalid when no token is given', async () => {
    // given: a request with no token query param
    const app = createTestApp()

    // when: the confirm endpoint is hit without one
    const response = await request(app).get('/api/confirm')

    // then: it redirects to the invalid result
    expect(response.headers.location).toBe('http://localhost:3000/?status=invalid')
  })
})

const SIGNUP_BODY = { password: 'longenough', passwordConfirmation: 'longenough' }
const FOUR_DAYS_MS = 4 * 24 * 60 * 60 * 1000

/** Moves a fake account's creation back in time, so it counts as older than the 3 day maximum. */
function ageUser(users: { rows: FakeUserRow[] }, email: string, byMs: number) {
  const row = users.rows.find((r) => r.email === email)!
  row.createdAt = new Date(row.createdAt.getTime() - byMs)
}

describe('sign up over an expired pending account (SIGNUP-EXPIRY-001)', () => {
  function setup() {
    const confirmationTokens = createFakeConfirmationTokenRepository()
    const users = createFakeUserRepository(confirmationTokens)
    const mailer = createFakeMailer()
    const app = createTestApp({ users, confirmationTokens, mailer })
    return { users, confirmationTokens, mailer, app }
  }

  it('replaces an expired pending account and answers 201', async () => {
    // given: an unconfirmed account created four days ago
    const { users, confirmationTokens, mailer, app } = setup()
    await request(app).post('/api/signup').send({ email: 'old@example.com', ...SIGNUP_BODY })
    ageUser(users, 'old@example.com', FOUR_DAYS_MS)

    // when: the same address signs up again
    const response = await request(app).post('/api/signup').send({ email: 'old@example.com', ...SIGNUP_BODY })

    // then: a new account replaced the old one, with only its own token, and a new email went out
    expect(response.status).toBe(201)
    expect(users.rows).toHaveLength(1)
    expect(users.rows[0].id).toBe(response.body.id)
    expect(confirmationTokens.rows).toHaveLength(1)
    expect(confirmationTokens.rows[0].userId).toBe(response.body.id)
    expect(mailer.sent).toHaveLength(2)
  })

  it('replaces an expired pending account on the expedite path too', async () => {
    // given: expedite is on and an unconfirmed account is four days old
    process.env.EXPEDITE_SIGNUP_ENABLED = 'true'
    const { users, app } = setup()
    await request(app).post('/api/signup').send({ email: 'old@example.com', ...SIGNUP_BODY })
    ageUser(users, 'old@example.com', FOUR_DAYS_MS)

    // when: the address signs up through the expedite route
    const response = await request(app).post('/api/signup/expedite').send({ email: 'old@example.com', ...SIGNUP_BODY })
    delete process.env.EXPEDITE_SIGNUP_ENABLED

    // then: the account is replaced by a confirmed one
    expect(response.status).toBe(201)
    expect(users.rows).toHaveLength(1)
    expect(users.rows[0].confirmedAt).not.toBeNull()
  })

  it('answers 409 for a pending account younger than the maximum age', async () => {
    // given: an unconfirmed account created two days ago
    const { users, app } = setup()
    await request(app).post('/api/signup').send({ email: 'young@example.com', ...SIGNUP_BODY })
    ageUser(users, 'young@example.com', 2 * 24 * 60 * 60 * 1000)

    // when: the same address signs up again
    const response = await request(app).post('/api/signup').send({ email: 'young@example.com', ...SIGNUP_BODY })

    // then: the address is still taken and the account is untouched
    expect(response.status).toBe(409)
    expect(response.body).toEqual({ error: 'email_taken' })
    expect(users.rows).toHaveLength(1)
  })

  it('answers 409 for a confirmed account, whatever its age', async () => {
    // given: a confirmed account created a year ago
    const { users, app } = setup()
    await request(app).post('/api/signup').send({ email: 'done@example.com', ...SIGNUP_BODY })
    users.rows[0].confirmedAt = new Date()
    ageUser(users, 'done@example.com', 365 * 24 * 60 * 60 * 1000)

    // when: the same address signs up again
    const response = await request(app).post('/api/signup').send({ email: 'done@example.com', ...SIGNUP_BODY })

    // then: it is never deleted
    expect(response.status).toBe(409)
    expect(users.rows).toHaveLength(1)
  })

  it('uses the max age from SIGNUP_PENDING_MAX_AGE_DAYS', async () => {
    // given: a limit of one day and an account two days old
    process.env.SIGNUP_PENDING_MAX_AGE_DAYS = '1'
    const { users, app } = setup()
    await request(app).post('/api/signup').send({ email: 'old@example.com', ...SIGNUP_BODY })
    ageUser(users, 'old@example.com', 2 * 24 * 60 * 60 * 1000)

    // when: signing up again
    const response = await request(app).post('/api/signup').send({ email: 'old@example.com', ...SIGNUP_BODY })
    delete process.env.SIGNUP_PENDING_MAX_AGE_DAYS

    // then: it is replaced
    expect(response.status).toBe(201)
  })

  it('leaves both the account and its tokens in place when the purge fails', async () => {
    // given: an expired pending account and a purge that throws
    const { users, confirmationTokens, app } = setup()
    await request(app).post('/api/signup').send({ email: 'old@example.com', ...SIGNUP_BODY })
    ageUser(users, 'old@example.com', FOUR_DAYS_MS)
    users.failPurge = true
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {})

    // when: the address signs up again
    const response = await request(app).post('/api/signup').send({ email: 'old@example.com', ...SIGNUP_BODY })
    errorLog.mockRestore()

    // then: the request fails and nothing was deleted
    expect(response.status).toBe(500)
    expect(users.rows).toHaveLength(1)
    expect(confirmationTokens.rows).toHaveLength(1)
  })

  it('answers status=invalid for the link of a purged account', async () => {
    // given: an expired pending account, then replaced by a new sign up
    const { users, mailer, app } = setup()
    await request(app).post('/api/signup').send({ email: 'old@example.com', ...SIGNUP_BODY })
    const oldToken = new URL(mailer.sent[0].confirmationLink).searchParams.get('token')
    ageUser(users, 'old@example.com', FOUR_DAYS_MS)
    await request(app).post('/api/signup').send({ email: 'old@example.com', ...SIGNUP_BODY })

    // when: the old link is visited
    const response = await request(app).get(`/api/confirm?token=${oldToken}`)

    // then: invalid, not a 500
    expect(response.status).toBe(302)
    expect(response.headers.location).toBe('http://localhost:3000/?status=invalid')
  })
})

describe('TRUST_PROXY (RESEND-CONFIRMATION-001)', () => {
  afterEach(() => {
    delete process.env.TRUST_PROXY
  })

  it.each(['false', '1', 'true', '10.0.0.0/8'])('starts with TRUST_PROXY=%s', (value) => {
    // given: the env var set to a value an operator might use
    process.env.TRUST_PROXY = value

    // when/then: building the app does not throw
    expect(() => createApp()).not.toThrow()
  })

  it('uses X-Forwarded-For for the IP limit only when the proxy is trusted', async () => {
    // given: an IP limit of 1 per hour, trust off, and two callers behind a proxy with different forwarded addresses
    process.env.RESEND_IP_MAX_PER_HOUR = '1'
    const untrusted = createTestApp()
    await request(untrusted).post('/api/signup/resend').send({ email: 'a@example.com' }).set('X-Forwarded-For', '1.1.1.1')

    // when: a second caller with another forwarded address
    const ignoredHeader = await request(untrusted).post('/api/signup/resend').send({ email: 'b@example.com' }).set('X-Forwarded-For', '2.2.2.2')

    // then: the header is ignored, both look like one IP, so the second is refused
    expect(ignoredHeader.status).toBe(429)

    // and: with the proxy trusted the two callers are told apart
    process.env.TRUST_PROXY = '1'
    const trusted = createTestApp()
    await request(trusted).post('/api/signup/resend').send({ email: 'a@example.com' }).set('X-Forwarded-For', '1.1.1.1')
    const distinct = await request(trusted).post('/api/signup/resend').send({ email: 'b@example.com' }).set('X-Forwarded-For', '2.2.2.2')
    delete process.env.RESEND_IP_MAX_PER_HOUR
    expect(distinct.status).toBe(200)
  })
})

describe('POST /api/signup/resend (RESEND-CONFIRMATION-001)', () => {
  function setup() {
    const confirmationTokens = createFakeConfirmationTokenRepository()
    const users = createFakeUserRepository(confirmationTokens)
    const resendRequests = createFakeResendRequestRepository()
    const mailer = createFakeMailer()
    const app = createTestApp({ users, confirmationTokens, resendRequests, mailer })
    return { users, confirmationTokens, resendRequests, mailer, app }
  }

  /** Signs up, then makes the sign up email the only thing in the log: the resend history starts empty. */
  async function signUp(app: ReturnType<typeof createTestApp>, email: string) {
    await request(app).post('/api/signup').send({ email, ...SIGNUP_BODY })
  }

  /** Moves every logged request back in time, so cooldown / cap windows can be crossed without waiting. */
  function ageResendLog(resendRequests: { rows: { createdAt: Date }[] }, byMs: number) {
    for (const row of resendRequests.rows) row.createdAt = new Date(row.createdAt.getTime() - byMs)
  }

  const envNames = ['RESEND_COOLDOWN_SECONDS', 'RESEND_MAX_PER_DAY', 'RESEND_IP_MAX_PER_HOUR']
  afterEach(() => {
    for (const name of envNames) delete process.env[name]
  })

  it('sends a new email with a new token for an unconfirmed account', async () => {
    // given: a signed-up, unconfirmed account
    const { confirmationTokens, mailer, app } = setup()
    await signUp(app, 'lost@example.com')

    // when: resending
    const response = await request(app).post('/api/signup/resend').send({ email: 'lost@example.com' })

    // then: 200, a second email, and the first (unused) token was replaced by the second
    expect(response.status).toBe(200)
    expect(response.body).toEqual({})
    expect(mailer.sent).toHaveLength(2)
    expect(mailer.sent[1].to).toBe('lost@example.com')
    expect(confirmationTokens.rows).toHaveLength(1)
  })

  it('refuses a second call inside the cooldown with 429 and Retry-After, sending nothing', async () => {
    // given: a resend that just happened
    const { confirmationTokens, mailer, app } = setup()
    await signUp(app, 'lost@example.com')
    await request(app).post('/api/signup/resend').send({ email: 'lost@example.com' })

    // when: resending again at once
    const response = await request(app).post('/api/signup/resend').send({ email: 'lost@example.com' })

    // then: 429 with the seconds left (at most the 60 s default), no new mail, no new token
    expect(response.status).toBe(429)
    const retryAfter = Number(response.headers['retry-after'])
    expect(retryAfter).toBeGreaterThan(0)
    expect(retryAfter).toBeLessThanOrEqual(60)
    expect(mailer.sent).toHaveLength(2)
    expect(confirmationTokens.rows).toHaveLength(1)
  })

  it('works again once the cooldown has passed', async () => {
    // given: a resend made 61 seconds ago
    const { resendRequests, mailer, app } = setup()
    await signUp(app, 'lost@example.com')
    await request(app).post('/api/signup/resend').send({ email: 'lost@example.com' })
    ageResendLog(resendRequests, 61 * 1000)

    // when: resending
    const response = await request(app).post('/api/signup/resend').send({ email: 'lost@example.com' })

    // then: it is sent
    expect(response.status).toBe(200)
    expect(mailer.sent).toHaveLength(3)
  })

  it('does not extend the cooldown, nor use the daily cap, when a call is refused', async () => {
    // given: one accepted resend, then two refused ones
    const { resendRequests, app } = setup()
    await signUp(app, 'lost@example.com')
    await request(app).post('/api/signup/resend').send({ email: 'lost@example.com' })
    await request(app).post('/api/signup/resend').send({ email: 'lost@example.com' })
    await request(app).post('/api/signup/resend').send({ email: 'lost@example.com' })

    // then: only the accepted call was logged
    expect(resendRequests.rows).toHaveLength(1)
  })

  it('refuses once the daily cap is reached, with Retry-After until the oldest send leaves the 24 h window', async () => {
    // given: a cap of 2 per day and a short cooldown, both used up an hour ago
    process.env.RESEND_MAX_PER_DAY = '2'
    process.env.RESEND_COOLDOWN_SECONDS = '1'
    const { resendRequests, mailer, app } = setup()
    await signUp(app, 'lost@example.com')
    await request(app).post('/api/signup/resend').send({ email: 'lost@example.com' })
    await request(app).post('/api/signup/resend').send({ email: 'lost@example.com' }) // inside cooldown: refused, not logged
    ageResendLog(resendRequests, 2000)
    await request(app).post('/api/signup/resend').send({ email: 'lost@example.com' })
    ageResendLog(resendRequests, 60 * 60 * 1000)
    const sentBefore = mailer.sent.length

    // when: a third resend within 24 h
    const response = await request(app).post('/api/signup/resend').send({ email: 'lost@example.com' })

    // then: 429, Retry-After about 23 hours, nothing sent
    expect(response.status).toBe(429)
    const retryAfter = Number(response.headers['retry-after'])
    expect(retryAfter).toBeGreaterThan(22 * 3600)
    expect(retryAfter).toBeLessThanOrEqual(23 * 3600)
    expect(mailer.sent).toHaveLength(sentBefore)
  })

  it('refuses with 429 when one IP exceeds the hourly limit, even for different addresses', async () => {
    // given: a limit of 2 requests per IP per hour
    process.env.RESEND_IP_MAX_PER_HOUR = '2'
    const { mailer, app } = setup()
    await request(app).post('/api/signup/resend').send({ email: 'a@example.com' })
    await request(app).post('/api/signup/resend').send({ email: 'b@example.com' })

    // when: the same IP asks for a third address
    const response = await request(app).post('/api/signup/resend').send({ email: 'c@example.com' })

    // then: 429, and nothing was mailed
    expect(response.status).toBe(429)
    expect(Number(response.headers['retry-after'])).toBeGreaterThan(0)
    expect(mailer.sent).toHaveLength(0)
  })

  it('gives an unknown address, a confirmed account and a real send the same reply, and 429 behaves the same too', async () => {
    // given: one unconfirmed account, one confirmed account, one unknown address
    const { users, mailer, app } = setup()
    await signUp(app, 'real@example.com')
    await signUp(app, 'confirmed@example.com')
    users.rows.find((r) => r.email === 'confirmed@example.com')!.confirmedAt = new Date()
    const sentBefore = mailer.sent.length

    // when: resending for each, then again for each
    const first = [
      await request(app).post('/api/signup/resend').send({ email: 'real@example.com' }),
      await request(app).post('/api/signup/resend').send({ email: 'confirmed@example.com' }),
      await request(app).post('/api/signup/resend').send({ email: 'nobody@example.com' }),
    ]
    const second = [
      await request(app).post('/api/signup/resend').send({ email: 'real@example.com' }),
      await request(app).post('/api/signup/resend').send({ email: 'confirmed@example.com' }),
      await request(app).post('/api/signup/resend').send({ email: 'nobody@example.com' }),
    ]

    // then: identical status and body in each round, and only the real account got an email
    expect(first.map((r) => [r.status, r.body])).toEqual([[200, {}], [200, {}], [200, {}]])
    expect(second.map((r) => r.status)).toEqual([429, 429, 429])
    expect(mailer.sent).toHaveLength(sentBefore + 1)
  })

  it('stores no raw email, only its hash', async () => {
    // given/when: a resend for an unknown address
    const { resendRequests, app } = setup()
    await request(app).post('/api/signup/resend').send({ email: 'Nobody@Example.com' })

    // then: the log has a 64-character hash and no address
    expect(resendRequests.rows).toHaveLength(1)
    expect(resendRequests.rows[0].emailHash).toMatch(/^[0-9a-f]{64}$/)
    expect(JSON.stringify(resendRequests.rows)).not.toMatch(/nobody/i)
  })

  it('answers 400 for a missing or malformed email', async () => {
    // given: nothing
    const { app } = setup()

    // when/then
    expect((await request(app).post('/api/signup/resend').send({})).status).toBe(400)
    expect((await request(app).post('/api/signup/resend').send({ email: 'not-an-email' })).status).toBe(400)
  })

  it('stops the old link and confirms the account with the new one', async () => {
    // given: a sign up, then a resend
    const { users, mailer, app } = setup()
    await signUp(app, 'lost@example.com')
    await request(app).post('/api/signup/resend').send({ email: 'lost@example.com' })
    const oldToken = new URL(mailer.sent[0].confirmationLink).searchParams.get('token')
    const newToken = new URL(mailer.sent[1].confirmationLink).searchParams.get('token')

    // when: both links are visited
    const oldResponse = await request(app).get(`/api/confirm?token=${oldToken}`)
    const newResponse = await request(app).get(`/api/confirm?token=${newToken}`)

    // then: the old one is invalid, the new one confirms
    expect(oldResponse.headers.location).toBe('http://localhost:3000/?status=invalid')
    expect(newResponse.headers.location).toBe('http://localhost:3000/?status=ok')
    expect(users.rows[0].confirmedAt).not.toBeNull()
  })

  it('sends nothing for an expired pending account and answers like an unknown address (SIGNUP-EXPIRY-001)', async () => {
    // given: an unconfirmed account four days old
    const { users, mailer, app } = setup()
    await signUp(app, 'old@example.com')
    ageUser(users, 'old@example.com', FOUR_DAYS_MS)
    const sentBefore = mailer.sent.length

    // when: resending
    const response = await request(app).post('/api/signup/resend').send({ email: 'old@example.com' })

    // then: the neutral 200, no email
    expect(response.status).toBe(200)
    expect(response.body).toEqual({})
    expect(mailer.sent).toHaveLength(sentBefore)
  })

  it('answers 500 and still counts the request when the mail fails', async () => {
    // given: a mailer that fails on the second call (the resend)
    const sent: string[] = []
    const failing: Mailer = {
      async sendConfirmationEmail(to) {
        if (sent.length >= 1) throw new Error('smtp down')
        sent.push(to)
      },
    }
    const resendRequests = createFakeResendRequestRepository()
    const confirmationTokens = createFakeConfirmationTokenRepository()
    const users = createFakeUserRepository(confirmationTokens)
    const app = createTestApp({ users, confirmationTokens, resendRequests, mailer: failing })
    await signUp(app, 'lost@example.com')
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {})

    // when: resending
    const response = await request(app).post('/api/signup/resend').send({ email: 'lost@example.com' })
    errorLog.mockRestore()

    // then: 500, the request is logged, and the first link still works (kept until a new one is delivered)
    expect(response.status).toBe(500)
    expect(resendRequests.rows).toHaveLength(1)
    expect(confirmationTokens.rows.filter((r) => r.usedAt === null).length).toBeGreaterThanOrEqual(1)
  })
})
