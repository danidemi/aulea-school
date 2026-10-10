import { describe, it, expect } from 'vitest'
import request from 'supertest'
import session from 'express-session'
import { createApp } from '../app.js'
import { hashPassword } from '../auth/password.js'
import type { NewUser, UserForLogin, UserRepository } from '../db/users.js'
import { UNIQUE_VIOLATION } from '../db/users.js'
import type { Tenant, TenantRepository } from '../db/tenants.js'

// Covers AUTH-UX-001's DoD (active_sprint/story_auth_ux.md): POST /api/login
// checks email+password against the stored hash and starts a session on
// success; the three rejection cases (unknown email, wrong password,
// unconfirmed account) all return the same generic error.
//
// Also covers TENANT-001's DoD (active_sprint/story_tenant_creation.md):
// a registered user always has a single current tenant, assigned (created
// if needed) at login and surfaced by GET /api/me.

/**
 * In-memory fake, same shape/rules as signup.test.ts's — kept local here
 * because login.test.ts additionally needs pre-seeded rows with a real
 * bcrypt hash, which signup.test.ts's fake has no reason to support.
 */
function createFakeUserRepository(): UserRepository & { rows: UserForLogin[] } {
  const rows: UserForLogin[] = []
  let nextId = 1

  return {
    rows,
    async create(user: NewUser) {
      if (rows.some((row) => row.email === user.email)) {
        throw Object.assign(new Error('duplicate key value violates unique constraint'), {
          cause: { code: UNIQUE_VIOLATION },
        })
      }
      const created: UserForLogin = {
        id: String(nextId++),
        email: user.email,
        passwordHash: user.passwordHash,
        confirmedAt: user.confirmedAt,
      }
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

/**
 * In-memory fake mirroring `createTenantRepository`'s create-once/reuse
 * behavior: the first call for a `userId` creates a tenant and remembers
 * it; every later call for the same `userId` returns that same tenant.
 */
function createFakeTenantRepository(): TenantRepository & { rows: Map<string, Tenant> } {
  const rows = new Map<string, Tenant>()
  let nextId = 1

  return {
    rows,
    async ensureCurrentTenant(userId: string, email: string) {
      const existing = rows.get(userId)
      if (existing) return existing
      const tenant: Tenant = { id: String(nextId++), name: `${email}'s workspace` }
      rows.set(userId, tenant)
      return tenant
    },
  }
}

/**
 * Real `express-session` with its default in-memory store — no Postgres
 * needed, but real enough to exercise cookie issuance and req.session
 * round-tripping across two requests via supertest's agent.
 */
function createTestSessionMiddleware() {
  return session({ secret: 'test-secret', resave: false, saveUninitialized: false, cookie: { secure: false } })
}

async function seedConfirmedUser(users: UserRepository & { rows: UserForLogin[] }, email: string, password: string) {
  const created = await users.create({ email, passwordHash: await hashPassword(password), confirmedAt: null })
  await users.confirmUser(created.id)
}

function createTestApp(overrides: { users: UserRepository; tenants?: TenantRepository }) {
  return createApp({
    users: overrides.users,
    tenants: overrides.tenants ?? createFakeTenantRepository(),
    sessionMiddleware: createTestSessionMiddleware(),
  })
}

describe('POST /api/login (AUTH-UX-001)', () => {
  it('creates a session and returns 200 for a confirmed user with the right password', async () => {
    // given: a confirmed user with a known password
    const users = createFakeUserRepository()
    await seedConfirmedUser(users, 'trainer@example.com', 'correcthorse')
    const app = createTestApp({ users })

    // when: logging in with the right credentials
    const response = await request(app).post('/api/login').send({ email: 'trainer@example.com', password: 'correcthorse' })

    // then: the login succeeds and a session cookie is issued
    expect(response.status).toBe(200)
    expect(response.body).toEqual({ id: '1', email: 'trainer@example.com' })
    expect(response.headers['set-cookie']).toBeDefined()
  })

  it('rejects with a generic error when the email does not exist', async () => {
    // given: no user with this email
    const users = createFakeUserRepository()
    const app = createTestApp({ users })

    // when: attempting to log in
    const response = await request(app).post('/api/login').send({ email: 'nobody@example.com', password: 'whatever1' })

    // then: it is rejected without revealing the email doesn't exist
    expect(response.status).toBe(401)
    expect(response.body).toEqual({ error: 'invalid_credentials' })
  })

  it('rejects with the same generic error when the password is wrong', async () => {
    // given: a confirmed user with a known password
    const users = createFakeUserRepository()
    await seedConfirmedUser(users, 'trainer@example.com', 'correcthorse')
    const app = createTestApp({ users })

    // when: logging in with the wrong password
    const response = await request(app).post('/api/login').send({ email: 'trainer@example.com', password: 'wrongpassword' })

    // then: it is rejected with the same generic error as an unknown email
    expect(response.status).toBe(401)
    expect(response.body).toEqual({ error: 'invalid_credentials' })
  })

  it('rejects with the same generic error when the account is unconfirmed', async () => {
    // given: an account that signed up but never confirmed
    const users = createFakeUserRepository()
    await users.create({ email: 'unconfirmed@example.com', passwordHash: await hashPassword('correcthorse'), confirmedAt: null })
    const app = createTestApp({ users })

    // when: attempting to log in with the right password
    const response = await request(app).post('/api/login').send({ email: 'unconfirmed@example.com', password: 'correcthorse' })

    // then: it is rejected — the account isn't usable yet, but the error doesn't say so
    expect(response.status).toBe(401)
    expect(response.body).toEqual({ error: 'invalid_credentials' })
  })

  it('rejects when email or password is missing from the request body', async () => {
    // given: a request missing the password field
    const users = createFakeUserRepository()
    const app = createTestApp({ users })

    // when: attempting to log in
    const response = await request(app).post('/api/login').send({ email: 'trainer@example.com' })

    // then: it is rejected the same way as any other invalid attempt
    expect(response.status).toBe(401)
    expect(response.body).toEqual({ error: 'invalid_credentials' })
  })
})

describe('GET /api/me (AUTH-UX-001 / TENANT-001)', () => {
  it('returns 401 when no session exists', async () => {
    // given: a client with no prior login
    const app = createTestApp({ users: createFakeUserRepository() })

    // when: asking who is signed in
    const response = await request(app).get('/api/me')

    // then: it reports not signed in
    expect(response.status).toBe(401)
  })

  it('returns the signed-in user and their current tenant after a successful login', async () => {
    // given: a confirmed user who has just logged in
    const users = createFakeUserRepository()
    await seedConfirmedUser(users, 'trainer@example.com', 'correcthorse')
    const app = createTestApp({ users })
    const agent = request.agent(app)
    await agent.post('/api/login').send({ email: 'trainer@example.com', password: 'correcthorse' })

    // when: asking who is signed in, using the same cookie jar
    const response = await agent.get('/api/me')

    // then: it reflects the signed-in user and a current tenant
    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      id: '1',
      email: 'trainer@example.com',
      tenant: { id: '1', name: "trainer@example.com's workspace" },
    })
  })
})

describe('POST /api/logout (LOGOUT-001)', () => {
  it('destroys the session so a subsequent GET /api/me reports signed out', async () => {
    // given: a confirmed user who is signed in
    const users = createFakeUserRepository()
    await seedConfirmedUser(users, 'trainer@example.com', 'correcthorse')
    const app = createTestApp({ users })
    const agent = request.agent(app)
    await agent.post('/api/login').send({ email: 'trainer@example.com', password: 'correcthorse' })

    // when: logging out
    const logoutResponse = await agent.post('/api/logout')

    // then: the logout succeeds and the session no longer authenticates
    expect(logoutResponse.status).toBe(200)
    expect(logoutResponse.body).toEqual({ ok: true })
    const meResponse = await agent.get('/api/me')
    expect(meResponse.status).toBe(401)
  })

  it('clears the session cookie', async () => {
    // given: a confirmed user who is signed in
    const users = createFakeUserRepository()
    await seedConfirmedUser(users, 'trainer@example.com', 'correcthorse')
    const app = createTestApp({ users })
    const agent = request.agent(app)
    await agent.post('/api/login').send({ email: 'trainer@example.com', password: 'correcthorse' })

    // when: logging out
    const response = await agent.post('/api/logout')

    // then: the response clears the cookie (an expired Set-Cookie for the session cookie name)
    const setCookie = ([] as string[]).concat(response.headers['set-cookie'] ?? [])
    expect(setCookie.some((cookie) => cookie.startsWith('connect.sid=;'))).toBe(true)
  })

  it('is idempotent — logging out with no session succeeds without error', async () => {
    // given: a client with no prior login
    const app = createTestApp({ users: createFakeUserRepository() })

    // when: logging out anyway
    const response = await request(app).post('/api/logout')

    // then: it reports success rather than an error
    expect(response.status).toBe(200)
    expect(response.body).toEqual({ ok: true })
  })
})

describe('TENANT-001: tenant assignment on login', () => {
  it('assigns the same tenant across repeated logins, not a new one each time', async () => {
    // given: a confirmed user who has already logged in once
    const users = createFakeUserRepository()
    await seedConfirmedUser(users, 'trainer@example.com', 'correcthorse')
    const tenants = createFakeTenantRepository()
    const app = createTestApp({ users, tenants })
    const firstLogin = await request(app).post('/api/login').send({ email: 'trainer@example.com', password: 'correcthorse' })
    const agent = request.agent(app)

    // when: logging in again
    await agent.post('/api/login').send({ email: 'trainer@example.com', password: 'correcthorse' })
    const response = await agent.get('/api/me')

    // then: the same tenant is assigned both times
    expect(firstLogin.status).toBe(200)
    expect(response.body.tenant).toEqual({ id: '1', name: "trainer@example.com's workspace" })
    expect(tenants.rows.size).toBe(1)
  })

  it('assigns different users their own separate tenants', async () => {
    // given: two different confirmed users
    const users = createFakeUserRepository()
    await seedConfirmedUser(users, 'trainer-a@example.com', 'correcthorse')
    await seedConfirmedUser(users, 'trainer-b@example.com', 'correcthorse')
    const tenants = createFakeTenantRepository()
    const app = createTestApp({ users, tenants })
    const agentA = request.agent(app)
    const agentB = request.agent(app)

    // when: both log in
    await agentA.post('/api/login').send({ email: 'trainer-a@example.com', password: 'correcthorse' })
    await agentB.post('/api/login').send({ email: 'trainer-b@example.com', password: 'correcthorse' })
    const meA = await agentA.get('/api/me')
    const meB = await agentB.get('/api/me')

    // then: each has their own tenant
    expect(meA.body.tenant.id).not.toBe(meB.body.tenant.id)
    expect(meA.body.tenant.name).toBe("trainer-a@example.com's workspace")
    expect(meB.body.tenant.name).toBe("trainer-b@example.com's workspace")
  })
})
