import { and, eq, isNull, lt } from 'drizzle-orm'
import { createDb } from './client.js'
import { confirmationTokens, users } from './schema.js'

export interface NewUser {
  email: string
  passwordHash: string
  confirmedAt: Date | null
}

export interface CreatedUser {
  id: string
  email: string
}

/**
 * AUTH-UX-001: the fields `POST /api/login` needs to verify a password and
 * reject unconfirmed accounts. `passwordHash` is nullable (Google-OAuth
 * users, LOGIN-001, never set one) — the login route treats a null hash
 * the same as a wrong password, not a distinct error, so it doesn't leak
 * which sign-in method an email used.
 */
export interface UserForLogin {
  id: string
  email: string
  passwordHash: string | null
  confirmedAt: Date | null
  // SIGNUP-EXPIRY-001: age of a pending account is measured from this.
  createdAt: Date
}

/**
 * Narrow persistence port for the signup routes (SIGNUP-EXPEDITE-001).
 * Kept narrow and interface-based so `app.test.ts`/route tests can inject
 * an in-memory fake — `server/src/db/client.ts` must stay unimported by
 * anything the DB-free unit test suite touches.
 *
 * No `findByEmail`-then-`create` here on purpose for signup: that shape
 * races (two concurrent signups with the same email can both pass the
 * check). The duplicate-email 409 is instead derived from the
 * unique-constraint violation `create` throws — see `isUniqueViolation`.
 * `findByEmail` itself is fine to expose for login (AUTH-UX-001), which
 * only ever reads, never creates from it.
 */
export interface UserRepository {
  create(user: NewUser): Promise<CreatedUser>
  // SIGN-UP-001: sets `confirmed_at` once the confirmation link has been
  // followed with a valid, unused, unexpired token.
  confirmUser(userId: string): Promise<void>
  // AUTH-UX-001: looks up a user by email for POST /api/login. Returns
  // null rather than throwing when no user matches, mirroring a normal
  // "not found" read rather than an error condition.
  findByEmail(email: string): Promise<UserForLogin | null>
  // SIGNUP-EXPIRY-001: in one transaction, deletes the unconfirmed account
  // with this email (and its confirmation tokens) when it was created before
  // `olderThan`. Resolves to whether an account was deleted. A confirmed or
  // a younger account is never touched.
  deleteExpiredPendingByEmail(email: string, olderThan: Date): Promise<boolean>
}

/** Postgres-error shape narrow enough to check the SQLSTATE code we care about. */
interface PgError {
  code?: string
  cause?: unknown
}

export const UNIQUE_VIOLATION = '23505'

/**
 * Drizzle (`drizzle-orm/node-postgres`) wraps the raw `pg` error in a
 * `DrizzleQueryError`, so the SQLSTATE `code` sits on `err.cause.code`,
 * not `err.code` directly (verified manually against a running Postgres
 * during SIGNUP-EXPEDITE-001 development — the fake repository in
 * signup.test.ts throws the raw shape, which this also matches).
 */
export function isUniqueViolation(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) return false
  const pgErr = err as PgError
  if (pgErr.code === UNIQUE_VIOLATION) return true
  return typeof pgErr.cause === 'object' && pgErr.cause !== null && (pgErr.cause as PgError).code === UNIQUE_VIOLATION
}

export function createUserRepository(
  databaseUrl: string,
  connection: ReturnType<typeof createDb> = createDb(databaseUrl),
): UserRepository {
  const { db } = connection

  return {
    async create(user) {
      const rows = await db
        .insert(users)
        .values({
          email: user.email,
          passwordHash: user.passwordHash,
          confirmedAt: user.confirmedAt,
        })
        .returning({ id: users.id, email: users.email })
      return rows[0]
    },

    async confirmUser(userId) {
      await db.update(users).set({ confirmedAt: new Date() }).where(eq(users.id, userId))
    },

    async findByEmail(email) {
      const rows = await db
        .select({
          id: users.id,
          email: users.email,
          passwordHash: users.passwordHash,
          confirmedAt: users.confirmedAt,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(eq(users.email, email))
        .limit(1)
      return rows[0] ?? null
    },

    async deleteExpiredPendingByEmail(email, olderThan) {
      return db.transaction(async (tx) => {
        const expired = and(eq(users.email, email), isNull(users.confirmedAt), lt(users.createdAt, olderThan))
        const rows = await tx.select({ id: users.id }).from(users).where(expired).for('update')
        if (rows.length === 0) return false
        await tx.delete(confirmationTokens).where(eq(confirmationTokens.userId, rows[0].id))
        await tx.delete(users).where(expired)
        return true
      })
    },
  }
}
