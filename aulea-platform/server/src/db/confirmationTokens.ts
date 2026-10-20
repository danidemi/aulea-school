import { and, eq, isNull, ne } from 'drizzle-orm'
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
  // Resolves to the stored row's id, so a caller can keep that one when it
  // deletes the older unused links (RESEND-CONFIRMATION-001).
  create(token: NewConfirmationToken): Promise<{ id: string }>
  findByHash(tokenHash: string): Promise<StoredConfirmationToken | null>
  markUsed(id: string): Promise<void>
  // RESEND-CONFIRMATION-001: deletes the account's unused links other than
  // `exceptId`, so an old link answers `status=invalid` once a new one is issued.
  deleteUnusedForUser(userId: string, exceptId: string): Promise<void>
}

export function createConfirmationTokenRepository(
  databaseUrl: string,
  connection: ReturnType<typeof createDb> = createDb(databaseUrl),
): ConfirmationTokenRepository {
  const { db } = connection

  return {
    async create(token) {
      const rows = await db
        .insert(confirmationTokens)
        .values({
          userId: token.userId,
          tokenHash: token.tokenHash,
          expiresAt: token.expiresAt,
        })
        .returning({ id: confirmationTokens.id })
      return rows[0]
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

    async deleteUnusedForUser(userId, exceptId) {
      await db
        .delete(confirmationTokens)
        .where(
          and(
            eq(confirmationTokens.userId, userId),
            isNull(confirmationTokens.usedAt),
            ne(confirmationTokens.id, exceptId),
          ),
        )
    },
  }
}
