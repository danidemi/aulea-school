import session from 'express-session'
import connectPgSimple from 'connect-pg-simple'
import pg from 'pg'
import type { RequestHandler } from 'express'

const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000

/**
 * AUTH-UX-001 / ADR-0005: `express-session` backed by `connect-pg-simple`,
 * pointed at the same Postgres database Drizzle uses. `createTableIfMissing`
 * is off — the `session` table is created by the Drizzle migration in
 * `server/src/db/schema.ts` (`sessions`), not by this library at runtime,
 * consistent with the sprint's DON'T about migrations happening outside the
 * one applied-at-startup path.
 *
 * Built once by `server/src/app.ts` and wrapped in a lazily-constructed
 * `RequestHandler` there, so DB-free tests (`app.test.ts`, `signup.test.ts`)
 * never need `DATABASE_URL`/`SESSION_SECRET` set — this function itself is
 * only ever called from behind that lazy wrapper.
 */
export function createSessionMiddleware(databaseUrl: string, sessionSecret: string): RequestHandler {
  const PgSessionStore = connectPgSimple(session)
  const pool = new pg.Pool({ connectionString: databaseUrl })

  return session({
    store: new PgSessionStore({ pool, tableName: 'session', createTableIfMissing: false }),
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: SESSION_MAX_AGE_MS,
    },
  })
}
