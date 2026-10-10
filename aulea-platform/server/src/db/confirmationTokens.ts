import { eq } from 'drizzle-orm'
import { createDb } from './client.js'
import { confirmationTokens } from './schema.js'

export interface NewConfirmationToken {
  userId: string
  tokenHash: string
  expiresAt: Date
}

export interface StoredConfirmationToken {
  id: string
  userId: string
  expiresAt: Date
  usedAt: Date | null
}

/**
 * Narrow persistence port for the confirmation-link flow (SIGN-UP-001).
 * Interface-based for the same reason as `UserRepository`
 * (`server/src/db/users.ts`): route tests inject an in-memory fake so the
 * DB-free unit test suite never imports `client.ts`.
 */
export interface ConfirmationTokenRepository {
  create(token: NewConfirmationToken): Promise<void>
  findByHash(tokenHash: string): Promise<StoredConfirmationToken | null>
  markUsed(id: string): Promise<void>
}

export function createConfirmationTokenRepository(databaseUrl: string): ConfirmationTokenRepository {
  const { db } = createDb(databaseUrl)

  return {
    async create(token) {
      await db.insert(confirmationTokens).values({
        userId: token.userId,
        tokenHash: token.tokenHash,
        expiresAt: token.expiresAt,
      })
    },

    async findByHash(tokenHash) {
      const rows = await db
        .select({
          id: confirmationTokens.id,
          userId: confirmationTokens.userId,
          expiresAt: confirmationTokens.expiresAt,
          usedAt: confirmationTokens.usedAt,
        })
        .from(confirmationTokens)
        .where(eq(confirmationTokens.tokenHash, tokenHash))
      return rows[0] ?? null
    },

    async markUsed(id) {
      await db.update(confirmationTokens).set({ usedAt: new Date() }).where(eq(confirmationTokens.id, id))
    },
  }
}
