import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import request from 'supertest'
import { createApp } from '../app.js'
import type { CreatedUser, NewUser, UserRepository } from '../db/users.js'
import { UNIQUE_VIOLATION } from '../db/users.js'
import type { ConfirmationTokenRepository, NewConfirmationToken, StoredConfirmationToken } from '../db/confirmationTokens.js'
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
function createFakeUserRepository(): UserRepository & {
  rows: (CreatedUser & { passwordHash: string; confirmedAt: Date | null })[]
} {
  const rows: (CreatedUser & { passwordHash: string; confirmedAt: Date | null })[] = []
  let nextId = 1

  return {
    rows,
    async create(user: NewUser) {
      if (rows.some((row) => row.email === user.email)) {
        throw Object.assign(new Error('duplicate key value violates unique constraint'), {
          cause: { code: UNIQUE_VIOLATION },
        })
      }
      const created = { id: String(nextId++), email: user.email, passwordHash: user.passwordHash, confirmedAt: user.confirmedAt }
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
  }
}

/** In-memory fake for the confirmation-tokens store (SIGN-UP-001). */
function createFakeConfirmationTokenRepository(): ConfirmationTokenRepository & { rows: (StoredConfirmationToken & { tokenHash: string })[] } {
  const rows: (StoredConfirmationToken & { tokenHash: string })[] = []
  let nextId = 1

  return {
    rows,
    async create(token: NewConfirmationToken) {
      rows.push({
        id: String(nextId++),
        userId: token.userId,
        tokenHash: token.tokenHash,
        expiresAt: token.expiresAt,
        usedAt: null,
      })
    },
    async findByHash(tokenHash: string) {
      return rows.find((row) => row.tokenHash === tokenHash) ?? null
    },
    async markUsed(id: string) {
      const row = rows.find((row) => row.id === id)
      if (row) row.usedAt = new Date()
    },
  }
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
  mailer?: Mailer
}) {
  return createApp({
    users: overrides?.users ?? createFakeUserRepository(),
    confirmationTokens: overrides?.confirmationTokens ?? createFakeConfirmationTokenRepository(),
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
      .send({ email: 'dev@example.com', password: 'longenough' })

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
      .send({ email: 'dev@example.com', password: 'longenough' })

    // then: it is rejected regardless of what the client sends
    expect(response.status).toBe(403)
    expect(response.body).toEqual({ error: 'feature_disabled' })
  })

  it('returns 409 when the email is already taken', async () => {
    // given: an email that already has an account
    const users = createFakeUserRepository()
    const app = createTestApp({ users })
    await request(app).post('/api/signup/expedite').send({ email: 'dev@example.com', password: 'longenough' })

    // when: signing up again with the same email
    const response = await request(app)
      .post('/api/signup/expedite')
      .send({ email: 'dev@example.com', password: 'anotherlongone' })

    // then: it is rejected as a duplicate
    expect(response.status).toBe(409)
    expect(response.body).toEqual({ error: 'email_taken' })
  })

  it('returns 400 when the password is shorter than 8 characters', async () => {
    // given: a password under the minimum length
    const app = createTestApp({ users: createFakeUserRepository() })

    // when: signing up
    const response = await request(app)
      .post('/api/signup/expedite')
      .send({ email: 'dev@example.com', password: 'short7x' })

    // then: it is rejected
    expect(response.status).toBe(400)
    expect(response.body).toEqual({ error: 'password_too_short' })
  })

  it('returns 400 when the email is missing', async () => {
    // given: no email in the request body
    const app = createTestApp({ users: createFakeUserRepository() })

    // when: signing up
    const response = await request(app).post('/api/signup/expedite').send({ password: 'longenough' })

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
    expect(response.body).toEqual({ expediteSignupEnabled: true })
  })

  it('reports the expedite flag as disabled when the env var is unset', async () => {
    // given: the env var is not set
    delete process.env.EXPEDITE_SIGNUP_ENABLED
    const app = createTestApp({ users: createFakeUserRepository() })

    // when: the client fetches config on load
    const response = await request(app).get('/api/config')

    // then: it defaults to off
    expect(response.status).toBe(200)
    expect(response.body).toEqual({ expediteSignupEnabled: false })
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
      .send({ email: 'newuser@example.com', password: 'longenough' })

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
    await request(app).post('/api/signup').send({ email: 'dup@example.com', password: 'longenough' })

    // when: signing up again with the same email
    const response = await request(app).post('/api/signup').send({ email: 'dup@example.com', password: 'anotherlongone' })

    // then: it is rejected as a duplicate
    expect(response.status).toBe(409)
    expect(response.body).toEqual({ error: 'email_taken' })
  })

  it('returns 400 when the password is shorter than 8 characters', async () => {
    // given: a password under the minimum length
    const app = createTestApp()

    // when: signing up
    const response = await request(app).post('/api/signup').send({ email: 'dev@example.com', password: 'short7x' })

    // then: it is rejected
    expect(response.status).toBe(400)
    expect(response.body).toEqual({ error: 'password_too_short' })
  })

  it('returns 400 when the email is missing', async () => {
    // given: no email in the request body
    const app = createTestApp()

    // when: signing up
    const response = await request(app).post('/api/signup').send({ password: 'longenough' })

    // then: it is rejected rather than reaching the insert
    expect(response.status).toBe(400)
    expect(response.body).toEqual({ error: 'invalid_email' })
  })
})

describe('GET /api/confirm (SIGN-UP-001)', () => {
  async function signUp(app: ReturnType<typeof createTestApp>, email: string) {
    await request(app).post('/api/signup').send({ email, password: 'longenough' })
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
