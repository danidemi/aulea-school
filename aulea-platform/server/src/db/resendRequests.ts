import { and, count, eq, gte, max, min, sql } from 'drizzle-orm'
import { createDb } from './client.js'
import { resendRequests } from './schema.js'

/** What a window is counted on: one email hash, or one client IP. */
export type ResendKey = { emailHash: string } | { ip: string }

export interface ResendWindow {
  count: number
  /** Time of the oldest request in the window, null when the window is empty. */
  oldestAt: Date | null
  /** Time of the newest request in the window, null when the window is empty. */
  newestAt: Date | null
}

/** The reads and the write `admit` hands to its callback, all inside one transaction. */
export interface ResendLog {
  /** Count, oldest and newest request for `key` since `since`. */
  windowSince(key: ResendKey, since: Date): Promise<ResendWindow>
  record(request: { emailHash: string; ip: string }): Promise<void>
}

/**
 * Narrow persistence port for the resend limits (RESEND-CONFIRMATION-001).
 * Interface-based like `ConfirmationTokenRepository`, so route tests inject
 * an in-memory fake and the DB-free unit suite never imports `client.ts`.
 * Limits derive from these rows (not memory), so they survive a restart.
 */
export interface ResendRequestRepository {
  /**
   * Runs `fn` with the log for this caller while no other `admit` for the same
   * IP or the same address can run: checking the limits and recording the
   * request are one atomic step. Without it, parallel requests would all pass
   * the checks before any of them is recorded, and each would send an email.
   * Keep `fn` short (no mail sending): it holds a transaction open.
   */
  admit<T>(caller: { ip: string; emailHash: string }, fn: (log: ResendLog) => Promise<T>): Promise<T>
}

export function createResendRequestRepository(
  databaseUrl: string,
  connection: ReturnType<typeof createDb> = createDb(databaseUrl),
): ResendRequestRepository {
  const { db } = connection
  type Executor = Pick<typeof db, 'select' | 'insert'>

  function logOn(executor: Executor): ResendLog {
    return {
      async record(request) {
        await executor.insert(resendRequests).values({ emailHash: request.emailHash, ip: request.ip })
      },

      async windowSince(key, since) {
        const column = 'emailHash' in key ? resendRequests.emailHash : resendRequests.ip
        const value = 'emailHash' in key ? key.emailHash : key.ip
        const rows = await executor
          .select({
            count: count(),
            oldestAt: min(resendRequests.createdAt),
            newestAt: max(resendRequests.createdAt),
          })
          .from(resendRequests)
          .where(and(eq(column, value), gte(resendRequests.createdAt, since)))
        const row = rows[0]
        return { count: Number(row.count), oldestAt: row.oldestAt ?? null, newestAt: row.newestAt ?? null }
      },
    }
  }

  return {
    async admit({ ip, emailHash }, fn) {
      return db.transaction(async (tx) => {
        // Always the IP lock first, then the address lock: one order for everybody, so no deadlock.
        await tx.execute(sql`select pg_advisory_xact_lock(1, hashtext(${ip}))`)
        await tx.execute(sql`select pg_advisory_xact_lock(2, hashtext(${emailHash}))`)
        return fn(logOn(tx))
      })
    },
  }
}
