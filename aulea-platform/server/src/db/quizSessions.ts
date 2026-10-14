import { and, desc, eq, inArray, sql } from 'drizzle-orm'
import { createDb } from './client.js'
import { quizSessions, quizSessionConnections, quizSessionAnswers, quizzes, courses } from './schema.js'

/**
 * Raw persisted shape — no derived `status` here (see
 * `server/src/routes/quizSessions.ts`'s `deriveStatus`, which turns these
 * timestamps into `closed` / `running` / `stopped` for a response).
 */
export interface QuizSession {
  id: string
  quizId: string
  timeLimitSeconds: number | null
  startedAt: Date | null
  closesAt: Date | null
  stoppedAt: Date | null
  // QUIZ-SESSION-PER-STUDENT-DELIVERY-001: force-shuffle override, set on
  // `start` alongside timeLimitSeconds. See schema.ts's doc comment.
  forceShuffleQuestions: boolean
  forceShuffleAnswers: boolean
  createdAt: Date
  updatedAt: Date
}

/**
 * QUIZ-SESSION-CONTROL-001: session create/start/stop(/reopen via start
 * again), all scoped to a tenant by joining `quiz_sessions.quizId ->
 * quizzes.courseId -> courses.tenantId` — never a denormalized tenantId
 * on this table. `null` from any of these means "doesn't exist, or exists
 * but isn't owned by this tenant" — same information-hiding shape
 * `CourseRepository.findByIdForTenant` already uses.
 */
export interface SessionRepository {
  createForQuiz(quizId: string, tenantId: string): Promise<QuizSession | null>
  // QUIZ-SESSION-PER-STUDENT-DELIVERY-001: forceShuffleQuestions/
  // forceShuffleAnswers are required (not optional) — every call site must
  // decide them explicitly (parsed from /start's body, defaulting to
  // `false` there, never silently defaulted again here) so a future
  // optional-parameter addition can't be silently dropped by a stale
  // caller.
  start(sessionId: string, tenantId: string, timeLimitSeconds: number | null, forceShuffleQuestions: boolean, forceShuffleAnswers: boolean): Promise<QuizSession | null>
  stop(sessionId: string, tenantId: string): Promise<QuizSession | null>
  findByIdForTenant(sessionId: string, tenantId: string): Promise<QuizSession | null>
  // QUIZ-TAKE-RENDER-001: no tenant — an anonymous student's phone has no
  // login (same reasoning as `ConnectionRepository`, see `db/schema.ts`).
  // Used only to derive/serve status and items, never anything
  // trainer-only (counts, other sessions of the same quiz, ...).
  findById(sessionId: string): Promise<QuizSession | null>
  // QUIZ-SESSION-HISTORY-001: every session ever created for one quiz,
  // newest first. `null` means the quiz doesn't exist or isn't owned by
  // this tenant — same information-hiding shape as the rest of this
  // repository — an empty array means the quiz exists but has no sessions
  // yet.
  listForQuiz(quizId: string, tenantId: string): Promise<QuizSession[] | null>
  // SESSION-DELETE-001: all-or-nothing hard delete of several sessions of
  // one quiz (and their connections and answers). `not_found`: some id is
  // not a session of this quiz in this tenant. `running`: some session is
  // running per `isRunning`, checked under a row lock in the same
  // transaction as the delete. `dryRun` only reports the counts.
  deleteForQuiz(
    quizId: string,
    tenantId: string,
    sessionIds: string[],
    options: { dryRun: boolean; isRunning: (session: QuizSession) => boolean },
  ): Promise<DeleteSessionsResult>
}

export type DeleteSessionsResult =
  | { outcome: 'ok'; sessionCount: number; answerCount: number }
  | { outcome: 'not_found' }
  | { outcome: 'running' }

const SELECT_COLUMNS = {
  id: quizSessions.id,
  quizId: quizSessions.quizId,
  timeLimitSeconds: quizSessions.timeLimitSeconds,
  startedAt: quizSessions.startedAt,
  closesAt: quizSessions.closesAt,
  stoppedAt: quizSessions.stoppedAt,
  forceShuffleQuestions: quizSessions.forceShuffleQuestions,
  forceShuffleAnswers: quizSessions.forceShuffleAnswers,
  createdAt: quizSessions.createdAt,
  updatedAt: quizSessions.updatedAt,
}

export function createSessionRepository(databaseUrl: string): SessionRepository {
  const { db } = createDb(databaseUrl)

  async function quizBelongsToTenant(quizId: string, tenantId: string): Promise<boolean> {
    const rows = await db
      .select({ id: quizzes.id })
      .from(quizzes)
      .innerJoin(courses, eq(quizzes.courseId, courses.id))
      .where(and(eq(quizzes.id, quizId), eq(courses.tenantId, tenantId)))
      .limit(1)
    return rows.length > 0
  }

  async function findRowForTenant(sessionId: string, tenantId: string) {
    const rows = await db
      .select(SELECT_COLUMNS)
      .from(quizSessions)
      .innerJoin(quizzes, eq(quizSessions.quizId, quizzes.id))
      .innerJoin(courses, eq(quizzes.courseId, courses.id))
      .where(and(eq(quizSessions.id, sessionId), eq(courses.tenantId, tenantId)))
      .limit(1)
    return rows[0] ?? null
  }

  return {
    async createForQuiz(quizId, tenantId) {
      if (!(await quizBelongsToTenant(quizId, tenantId))) return null
      const rows = await db.insert(quizSessions).values({ quizId }).returning(SELECT_COLUMNS)
      return rows[0]
    },

    async start(sessionId, tenantId, timeLimitSeconds, forceShuffleQuestions, forceShuffleAnswers) {
      const existing = await findRowForTenant(sessionId, tenantId)
      if (!existing) return null
      const startedAt = new Date()
      const closesAt = timeLimitSeconds != null ? new Date(startedAt.getTime() + timeLimitSeconds * 1000) : null
      const rows = await db
        .update(quizSessions)
        .set({ timeLimitSeconds, startedAt, closesAt, stoppedAt: null, forceShuffleQuestions, forceShuffleAnswers, updatedAt: new Date() })
        .where(eq(quizSessions.id, sessionId))
        .returning(SELECT_COLUMNS)
      return rows[0] ?? null
    },

    async stop(sessionId, tenantId) {
      const existing = await findRowForTenant(sessionId, tenantId)
      if (!existing) return null
      const rows = await db
        .update(quizSessions)
        .set({ stoppedAt: new Date(), updatedAt: new Date() })
        .where(eq(quizSessions.id, sessionId))
        .returning(SELECT_COLUMNS)
      return rows[0] ?? null
    },

    async findByIdForTenant(sessionId, tenantId) {
      return findRowForTenant(sessionId, tenantId)
    },

    async findById(sessionId) {
      const rows = await db.select(SELECT_COLUMNS).from(quizSessions).where(eq(quizSessions.id, sessionId)).limit(1)
      return rows[0] ?? null
    },

    async listForQuiz(quizId, tenantId) {
      if (!(await quizBelongsToTenant(quizId, tenantId))) return null
      return db.select(SELECT_COLUMNS).from(quizSessions).where(eq(quizSessions.quizId, quizId)).orderBy(desc(quizSessions.createdAt))
    },

    async deleteForQuiz(quizId, tenantId, sessionIds, { dryRun, isRunning }) {
      const ids = [...new Set(sessionIds)]
      return db.transaction(async (tx) => {
        const found = await tx
          .select(SELECT_COLUMNS)
          .from(quizSessions)
          .innerJoin(quizzes, eq(quizSessions.quizId, quizzes.id))
          .innerJoin(courses, eq(quizzes.courseId, courses.id))
          .where(and(eq(quizSessions.quizId, quizId), eq(courses.tenantId, tenantId), inArray(quizSessions.id, ids)))
          .for('update', { of: quizSessions })
        if (found.length !== ids.length) return { outcome: 'not_found' as const }
        if (found.some((row) => isRunning(row))) return { outcome: 'running' as const }

        const connectionIds = tx
          .select({ id: quizSessionConnections.id })
          .from(quizSessionConnections)
          .where(inArray(quizSessionConnections.sessionId, ids))
        const [{ count }] = await tx
          .select({ count: sql<number>`count(*)::int` })
          .from(quizSessionAnswers)
          .where(inArray(quizSessionAnswers.connectionId, connectionIds))
        const result = { outcome: 'ok' as const, sessionCount: ids.length, answerCount: count }
        if (dryRun) return result

        await tx.delete(quizSessionAnswers).where(inArray(quizSessionAnswers.connectionId, connectionIds))
        await tx.delete(quizSessionConnections).where(inArray(quizSessionConnections.sessionId, ids))
        await tx.delete(quizSessions).where(inArray(quizSessions.id, ids))
        return result
      })
    },
  }
}
