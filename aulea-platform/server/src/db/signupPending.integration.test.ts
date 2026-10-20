import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { createUserRepository, isUniqueViolation, type UserRepository } from './users.js'
import { createConfirmationTokenRepository, type ConfirmationTokenRepository } from './confirmationTokens.js'
import { createResendRequestRepository, type ResendRequestRepository } from './resendRequests.js'
import { confirmationTokens, resendRequests, users } from './schema.js'
import { startPostgres, type TestPostgres } from '../testSupport/postgresContainer.js'

// TEST-INTEGRATION-001 / ADR-0014: SIGNUP-EXPIRY-001's purge transaction and
// RESEND-CONFIRMATION-001's window counting, on a real Postgres, for what the
// DB-free fakes only mirror: the all-or-nothing delete, the foreign key order,
// the unique email index, and the time-window queries.

const DAY_MS = 24 * 60 * 60 * 1000

let pg: TestPostgres
let userRepository: UserRepository
let tokenRepository: ConfirmationTokenRepository
let resendRepository: ResendRequestRepository

beforeAll(async () => {
  pg = await startPostgres()
  userRepository = createUserRepository(pg.url, { db: pg.db, pool: pg.pool })
  tokenRepository = createConfirmationTokenRepository(pg.url, { db: pg.db, pool: pg.pool })
  resendRepository = createResendRequestRepository(pg.url, { db: pg.db, pool: pg.pool })
})

afterAll(async () => {
  await pg?.stop()
})

let counter = 0

/** A user created `ageMs` ago, with one unused token. Every test builds its own, so tests never see each other's rows. */
async function seedUser({ ageMs = 0, confirmed = false } = {}) {
  counter += 1
  const email = `user-${counter}@example.com`
  const createdAt = new Date(Date.now() - ageMs)
  const [user] = await pg.db
    .insert(users)
    .values({ email, passwordHash: 'x', confirmedAt: confirmed ? createdAt : null, createdAt })
    .returning()
  const { id: tokenId } = await tokenRepository.create({
    userId: user.id,
    tokenHash: `hash-${counter}`,
    expiresAt: new Date(Date.now() + DAY_MS),
  })
  return { userId: user.id, email, tokenId }
}

const usersWithEmail = (email: string) => pg.db.select().from(users).where(eq(users.email, email))
const tokensOf = (userId: string) => pg.db.select().from(confirmationTokens).where(eq(confirmationTokens.userId, userId))

describe('deleteExpiredPendingByEmail (SIGNUP-EXPIRY-001)', () => {
  const olderThan = () => new Date(Date.now() - 3 * DAY_MS)

  it('deletes an expired pending account and its tokens, and reports it', async () => {
    // given: an unconfirmed account four days old, with a token
    const { userId, email } = await seedUser({ ageMs: 4 * DAY_MS })

    // when: purging with a three day limit
    const deleted = await userRepository.deleteExpiredPendingByEmail(email, olderThan())

    // then: both rows are gone
    expect(deleted).toBe(true)
    expect(await usersWithEmail(email)).toHaveLength(0)
    expect(await tokensOf(userId)).toHaveLength(0)
  })

  it('leaves a young pending account and its tokens alone', async () => {
    // given: an unconfirmed account two days old
    const { userId, email } = await seedUser({ ageMs: 2 * DAY_MS })

    // when: purging
    const deleted = await userRepository.deleteExpiredPendingByEmail(email, olderThan())

    // then: nothing is deleted
    expect(deleted).toBe(false)
    expect(await usersWithEmail(email)).toHaveLength(1)
    expect(await tokensOf(userId)).toHaveLength(1)
  })

  it('never deletes a confirmed account, whatever its age', async () => {
    // given: a confirmed account a year old
    const { userId, email } = await seedUser({ ageMs: 365 * DAY_MS, confirmed: true })

    // when: purging
    const deleted = await userRepository.deleteExpiredPendingByEmail(email, olderThan())

    // then: nothing is deleted
    expect(deleted).toBe(false)
    expect(await usersWithEmail(email)).toHaveLength(1)
    expect(await tokensOf(userId)).toHaveLength(1)
  })

  it('only touches the account with the given email', async () => {
    // given: two expired pending accounts
    const target = await seedUser({ ageMs: 4 * DAY_MS })
    const other = await seedUser({ ageMs: 4 * DAY_MS })

    // when: purging one
    await userRepository.deleteExpiredPendingByEmail(target.email, olderThan())

    // then: the other is intact
    expect(await usersWithEmail(other.email)).toHaveLength(1)
    expect(await tokensOf(other.userId)).toHaveLength(1)
  })

  it('rolls back the token delete when the user delete fails', async () => {
    // given: an expired pending account that something else references, so deleting the user row fails
    const { userId, email } = await seedUser({ ageMs: 4 * DAY_MS })
    await pg.pool.query(
      `CREATE TABLE IF NOT EXISTS purge_blocker (user_id uuid NOT NULL REFERENCES users(id) ON DELETE NO ACTION)`,
    )
    await pg.pool.query(`INSERT INTO purge_blocker (user_id) VALUES ($1)`, [userId])

    // when: purging
    await expect(userRepository.deleteExpiredPendingByEmail(email, olderThan())).rejects.toThrow()

    // then: all or nothing, the tokens deleted first are back
    expect(await usersWithEmail(email)).toHaveLength(1)
    expect(await tokensOf(userId)).toHaveLength(1)
    await pg.pool.query(`DELETE FROM purge_blocker WHERE user_id = $1`, [userId])
  })

  it('frees the address: a new account with the same email can be created after the purge, and not before', async () => {
    // given: an expired pending account
    const { email } = await seedUser({ ageMs: 4 * DAY_MS })

    // when/then: creating again is a unique violation, until the purge removed the old row
    const insert = () => userRepository.create({ email, passwordHash: 'y', confirmedAt: null })
    await expect(insert()).rejects.toSatisfy(isUniqueViolation)
    await userRepository.deleteExpiredPendingByEmail(email, olderThan())
    await expect(insert()).resolves.toMatchObject({ email })
  })

  it('findByEmail returns the creation time', async () => {
    // given: an account created two days ago
    const { email } = await seedUser({ ageMs: 2 * DAY_MS })

    // when
    const found = await userRepository.findByEmail(email)

    // then
    expect(Date.now() - found!.createdAt.getTime()).toBeGreaterThan(2 * DAY_MS - 60_000)
  })
})

describe('deleteUnusedForUser (RESEND-CONFIRMATION-001)', () => {
  it('deletes the unused tokens of the account except the kept one, and nobody else’s', async () => {
    // given: an account with an old unused token, a used one, and a new one; plus another account's token
    const { userId, tokenId: oldId } = await seedUser()
    const other = await seedUser()
    const { id: usedId } = await tokenRepository.create({ userId, tokenHash: 'used', expiresAt: new Date(Date.now() + DAY_MS) })
    await tokenRepository.markUsed(usedId)
    const { id: newId } = await tokenRepository.create({ userId, tokenHash: 'new', expiresAt: new Date(Date.now() + DAY_MS) })

    // when
    await tokenRepository.deleteUnusedForUser(userId, newId)

    // then: the old unused one is gone; the used one and the new one stay; the other account is untouched
    const remaining = (await tokensOf(userId)).map((t) => t.id).sort()
    expect(remaining).toEqual([usedId, newId].sort())
    expect(remaining).not.toContain(oldId)
    expect(await tokensOf(other.userId)).toHaveLength(1)
  })
})

describe('resend request windows (RESEND-CONFIRMATION-001)', () => {
  let n = 0
  const uniqueKey = () => ({ emailHash: `email-hash-${++n}-${Math.random()}`, ip: `10.0.0.${n}-${Math.random()}` })

  async function recordAt(emailHash: string, ip: string, ageMs: number) {
    await pg.db.insert(resendRequests).values({ emailHash, ip, createdAt: new Date(Date.now() - ageMs) })
  }

  it('is empty before anything is recorded', async () => {
    // given/when
    const { emailHash } = uniqueKey()
    const window = await resendRepository.admit({ ip: 'x', emailHash }, (log) => log.windowSince({ emailHash }, new Date(Date.now() - DAY_MS)))

    // then
    expect(window).toEqual({ count: 0, oldestAt: null, newestAt: null })
  })

  it('counts by email hash within the window, with oldest and newest', async () => {
    // given: three requests for one address (2 h, 30 min, and 2 days ago) and one for another
    const { emailHash, ip } = uniqueKey()
    await recordAt(emailHash, ip, 2 * 60 * 60 * 1000)
    await recordAt(emailHash, ip, 30 * 60 * 1000)
    await recordAt(emailHash, ip, 2 * DAY_MS)
    await recordAt(uniqueKey().emailHash, ip, 1000)

    // when: the 24 h window
    const window = await resendRepository.admit({ ip: 'x', emailHash }, (log) => log.windowSince({ emailHash }, new Date(Date.now() - DAY_MS)))

    // then: the 2-day-old one is outside it
    expect(window.count).toBe(2)
    expect(Date.now() - window.oldestAt!.getTime()).toBeGreaterThan(2 * 60 * 60 * 1000 - 5000)
    expect(Date.now() - window.newestAt!.getTime()).toBeLessThan(31 * 60 * 1000)
  })

  it('counts by IP across different addresses', async () => {
    // given: one IP asking for two addresses
    const { ip } = uniqueKey()
    await recordAt(uniqueKey().emailHash, ip, 1000)
    await recordAt(uniqueKey().emailHash, ip, 2000)

    // when
    const window = await resendRepository.admit({ ip, emailHash: 'x' }, (log) => log.windowSince({ ip }, new Date(Date.now() - 60 * 60 * 1000)))

    // then
    expect(window.count).toBe(2)
  })

  it('record writes a row that the next window query sees', async () => {
    // given/when
    const { emailHash, ip } = uniqueKey()
    await resendRepository.admit({ ip, emailHash }, (log) => log.record({ emailHash, ip }))
    const window = await resendRepository.admit({ ip, emailHash }, (log) => log.windowSince({ emailHash }, new Date(Date.now() - 60 * 1000)))

    // then
    expect(window.count).toBe(1)
  })

  it('lets exactly one of ten parallel requests through when the cooldown allows one', async () => {
    // given: ten simultaneous requests for one address, each checking "fewer than 1 in the last minute" and recording
    const { emailHash, ip } = uniqueKey()
    const attempt = () =>
      resendRepository.admit({ ip, emailHash }, async (log) => {
        const recent = await log.windowSince({ emailHash }, new Date(Date.now() - 60_000))
        if (recent.count >= 1) return false
        await log.record({ emailHash, ip })
        return true
      })

    // when
    const results = await Promise.all(Array.from({ length: 10 }, attempt))

    // then: one admitted, nine refused, one row
    expect(results.filter(Boolean)).toHaveLength(1)
    expect(await pg.db.select().from(resendRequests).where(eq(resendRequests.emailHash, emailHash))).toHaveLength(1)
  })

  it('does not deadlock when callers share an IP but not an address, or an address but not an IP', async () => {
    // given: 20 concurrent admits mixing shared IPs and shared addresses
    const a = uniqueKey()
    const b = uniqueKey()
    const callers = Array.from({ length: 20 }, (_, i) => ({ ip: i % 2 ? a.ip : b.ip, emailHash: i % 3 ? a.emailHash : b.emailHash }))

    // when/then: all finish
    await expect(
      Promise.all(callers.map((caller) => resendRepository.admit(caller, (log) => log.record(caller)))),
    ).resolves.toHaveLength(20)
  })
})
