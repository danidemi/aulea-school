interface PgError {
  code?: string
  cause?: unknown
}

/**
 * ROUTE-ID-GUARD-001: Postgres's SQLSTATE for "the text handed to a
 * column expecting a different type doesn't parse as that type" — the
 * error a non-UUID-shaped id produces against a `uuid` column (e.g.
 * `courses.id`). Shared here rather than duplicated per repository,
 * mirroring `users.ts`'s `UNIQUE_VIOLATION`/`isUniqueViolation` pair.
 */
export const INVALID_TEXT_REPRESENTATION = '22P02'

/**
 * Same wrapped-error shape `isUniqueViolation` (`db/users.ts`) already
 * accounts for: Drizzle (`drizzle-orm/node-postgres`) wraps the raw `pg`
 * error in a `DrizzleQueryError`, so the SQLSTATE `code` sits on
 * `err.cause.code`, not `err.code` directly.
 */
export function isInvalidIdError(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) return false
  const pgErr = err as PgError
  if (pgErr.code === INVALID_TEXT_REPRESENTATION) return true
  return typeof pgErr.cause === 'object' && pgErr.cause !== null && (pgErr.cause as PgError).code === INVALID_TEXT_REPRESENTATION
}
