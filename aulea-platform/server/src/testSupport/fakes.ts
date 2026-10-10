import session from 'express-session'
import request from 'supertest'
import { createApp } from '../app.js'
import { hashPassword } from '../auth/password.js'
import type { NewUser, UserForLogin, UserRepository } from '../db/users.js'
import { UNIQUE_VIOLATION } from '../db/users.js'
import type { Course, CourseRepository, CourseSort, NewCourse } from '../db/courses.js'
import type { Tenant, TenantRepository } from '../db/tenants.js'
import type { NewQuiz, NewQuizFile, Quiz, QuizFile, QuizFileUpdate, QuizRepository } from '../db/quizzes.js'
import type { QuizSession, SessionRepository } from '../db/quizSessions.js'
import type { ConnectionRepository, QuizSessionConnection } from '../db/quizSessionConnections.js'
import type { GradingStatus, NewQuizSessionAnswer, QuizSessionAnswer, QuizSessionAnswerRepository } from '../db/quizSessionAnswers.js'
import { INVALID_TEXT_REPRESENTATION } from '../db/errors.js'

/**
 * ROUTE-ID-GUARD-001: real Postgres rejects a non-UUID-shaped value given
 * to a `uuid` column with SQLSTATE 22P02 before any row lookup happens —
 * `findByIdForTenant('does-not-exist', ...)` never gets as far as "no
 * matching row", it throws first. `createFakeCourseRepository` now hands
 * out real UUID-shaped ids (`fakeUuid`, below) instead of plain
 * incrementing integers, so it can draw the same distinction: a
 * UUID-shaped id that matches no row is a normal miss (-> `null`); an id
 * that isn't UUID-shaped at all throws, the same way Postgres does.
 */
const UUID_SHAPE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function fakeUuid(n: number): string {
  const hex = n.toString(16).padStart(12, '0')
  return `00000000-0000-4000-8000-${hex}`
}

function throwIfNotUuidShaped(id: string): void {
  if (!UUID_SHAPE.test(id)) {
    throw Object.assign(new Error('invalid input syntax for type uuid'), {
      cause: { code: INVALID_TEXT_REPRESENTATION },
    })
  }
}

/**
 * Shared in-memory fakes for route tests, factored out of
 * `courses.test.ts` when `quizzes.test.ts` needed the same
 * users/tenants/courses fakes (QUIZ-DASHBOARD-001) — kept here rather
 * than duplicated a third time.
 */

export function createFakeUserRepository(): UserRepository & { rows: UserForLogin[] } {
  const rows: UserForLogin[] = []
  let nextId = 1
  return {
    rows,
    async create(user: NewUser) {
      const created: UserForLogin = { id: String(nextId++), email: user.email, passwordHash: user.passwordHash, confirmedAt: user.confirmedAt }
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

export function createFakeTenantRepository(): TenantRepository {
  const rows = new Map<string, Tenant>()
  let nextId = 1
  return {
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
 * In-memory fake enforcing the same (tenantId, title) uniqueness the real
 * `courses_tenant_id_title_unique` index does, throwing the same wrapped
 * shape `isUniqueViolation` recognizes (mirrors signup.test.ts's fake for
 * the email-uniqueness case).
 */
export function createFakeCourseRepository(): CourseRepository & { rows: (Course & { tenantId: string })[] } {
  const rows: (Course & { tenantId: string })[] = []
  let nextId = 1

  return {
    rows,
    async listByTenant(tenantId: string, sortBy: CourseSort) {
      return rows
        .filter((row) => row.tenantId === tenantId)
        .map(({ id, title, createdAt, updatedAt }) => ({ id, title, createdAt, updatedAt }))
        .sort((a, b) => (a[sortBy] < b[sortBy] ? -1 : a[sortBy] > b[sortBy] ? 1 : 0))
    },
    async create(course: NewCourse) {
      if (rows.some((row) => row.tenantId === course.tenantId && row.title === course.title)) {
        throw Object.assign(new Error('duplicate key value violates unique constraint'), {
          cause: { code: UNIQUE_VIOLATION },
        })
      }
      const now = new Date(Date.now() + rows.length) // stable, increasing across calls in one test
      const created = { id: fakeUuid(nextId++), tenantId: course.tenantId, title: course.title, createdAt: now, updatedAt: now }
      rows.push(created)
      return { id: created.id, title: created.title, createdAt: created.createdAt, updatedAt: created.updatedAt }
    },
    async findByIdForTenant(courseId: string, tenantId: string) {
      throwIfNotUuidShaped(courseId)
      const row = rows.find((row) => row.id === courseId && row.tenantId === tenantId)
      return row ? { id: row.id, title: row.title, createdAt: row.createdAt, updatedAt: row.updatedAt } : null
    },
  }
}

/**
 * Moved here from `quizzes.test.ts` (QUIZ-SESSION-CONTROL-001) when
 * `quizSessions.test.ts` needed the same courses/quizzes fakes to build a
 * fake `SessionRepository` on top of — kept here rather than duplicated a
 * third time, same rationale as this file's own header comment.
 */
export function createFakeQuizRepository(
  courses?: CourseRepository & { rows: (Course & { tenantId: string })[] },
): QuizRepository & { rows: (Quiz & { courseId: string })[]; fileRows: (QuizFile & { quizId: string })[] } {
  const rows: (Quiz & { courseId: string })[] = []
  const fileRows: (QuizFile & { quizId: string })[] = []
  let nextId = 1
  let nextFileId = 1

  function replaceFiles(quizId: string, files: NewQuizFile[]) {
    for (let i = fileRows.length - 1; i >= 0; i--) {
      if (fileRows[i].quizId === quizId) fileRows.splice(i, 1)
    }
    for (const file of files) {
      fileRows.push({ id: fakeUuid(nextFileId++), quizId, relativePath: file.relativePath, fileData: file.fileData, mimeType: file.mimeType ?? null })
    }
  }

  return {
    rows,
    fileRows,
    async listByCourse(courseId: string) {
      return rows.filter((row) => row.courseId === courseId).map(({ id, title, fileName, status, createdAt, updatedAt }) => ({ id, title, fileName, status, createdAt, updatedAt }))
    },
    async create(quiz: NewQuiz) {
      const now = new Date()
      const created = { id: fakeUuid(nextId++), courseId: quiz.courseId, title: quiz.title, fileName: quiz.fileName, status: 'uploaded', createdAt: now, updatedAt: now }
      rows.push(created)
      replaceFiles(created.id, quiz.files)
      return { id: created.id, title: created.title, fileName: created.fileName, status: created.status, createdAt: created.createdAt, updatedAt: created.updatedAt }
    },
    async delete(quizId: string, courseId: string) {
      const index = rows.findIndex((row) => row.id === quizId && row.courseId === courseId)
      if (index === -1) return false
      rows.splice(index, 1)
      replaceFiles(quizId, [])
      return true
    },
    async replaceFile(quizId: string, courseId: string, file: QuizFileUpdate) {
      const row = rows.find((row) => row.id === quizId && row.courseId === courseId)
      if (!row) return null
      row.fileName = file.fileName
      row.updatedAt = new Date()
      replaceFiles(quizId, file.files)
      return { id: row.id, title: row.title, fileName: row.fileName, status: row.status, createdAt: row.createdAt, updatedAt: row.updatedAt }
    },
    async getFiles(quizId: string, courseId: string) {
      const row = rows.find((row) => row.id === quizId && row.courseId === courseId)
      if (!row) return []
      return fileRows.filter((f) => f.quizId === quizId).map(({ id, relativePath, fileData, mimeType }) => ({ id, relativePath, fileData, mimeType }))
    },
    async getFilesByQuizId(quizId: string) {
      return fileRows.filter((f) => f.quizId === quizId).map(({ id, relativePath, fileData, mimeType }) => ({ id, relativePath, fileData, mimeType }))
    },
    async findByIdWithCourseForTenant(quizId: string, tenantId: string) {
      throwIfNotUuidShaped(quizId)
      const quiz = rows.find((row) => row.id === quizId)
      if (!quiz || !courses) return null
      const course = courses.rows.find((row) => row.id === quiz.courseId && row.tenantId === tenantId)
      return course ? { id: quiz.id, title: quiz.title, courseId: course.id, courseTitle: course.title } : null
    },
  }
}

/**
 * QUIZ-SESSION-CONTROL-001: mirrors `SessionRepository`'s real tenancy
 * check (`quizId -> quizzes.courseId -> courses.tenantId`) against the
 * courses/quizzes fakes' own row arrays, and — per ROUTE-ID-GUARD-001's
 * lesson — hands out real UUID-shaped ids and throws the same wrapped
 * `22P02` shape for a non-UUID-shaped `quizId` or `sessionId`, so a test
 * actually exercises this router's malformed-id guards.
 */
export function createFakeSessionRepository(
  quizzes: QuizRepository & { rows: (Quiz & { courseId: string })[] },
  courses: CourseRepository & { rows: (Course & { tenantId: string })[] },
): SessionRepository & { rows: QuizSession[] } {
  const rows: QuizSession[] = []
  let nextId = 1

  function quizBelongsToTenant(quizId: string, tenantId: string): boolean {
    const quiz = quizzes.rows.find((row) => row.id === quizId)
    if (!quiz) return false
    const course = courses.rows.find((row) => row.id === quiz.courseId)
    return course?.tenantId === tenantId
  }

  function findRowForTenant(sessionId: string, tenantId: string): QuizSession | null {
    throwIfNotUuidShaped(sessionId)
    const row = rows.find((row) => row.id === sessionId)
    if (!row) return null
    return quizBelongsToTenant(row.quizId, tenantId) ? row : null
  }

  return {
    rows,
    async createForQuiz(quizId: string, tenantId: string) {
      throwIfNotUuidShaped(quizId)
      if (!quizBelongsToTenant(quizId, tenantId)) return null
      const now = new Date()
      const created: QuizSession = {
        id: fakeUuid(nextId++),
        quizId,
        timeLimitSeconds: null,
        startedAt: null,
        closesAt: null,
        stoppedAt: null,
        forceShuffleQuestions: false,
        forceShuffleAnswers: false,
        createdAt: now,
        updatedAt: now,
      }
      rows.push(created)
      return created
    },
    async start(sessionId: string, tenantId: string, timeLimitSeconds: number | null, forceShuffleQuestions: boolean, forceShuffleAnswers: boolean) {
      const row = findRowForTenant(sessionId, tenantId)
      if (!row) return null
      row.timeLimitSeconds = timeLimitSeconds
      row.startedAt = new Date()
      row.closesAt = timeLimitSeconds != null ? new Date(row.startedAt.getTime() + timeLimitSeconds * 1000) : null
      row.stoppedAt = null
      row.forceShuffleQuestions = forceShuffleQuestions
      row.forceShuffleAnswers = forceShuffleAnswers
      row.updatedAt = new Date()
      return row
    },
    async stop(sessionId: string, tenantId: string) {
      const row = findRowForTenant(sessionId, tenantId)
      if (!row) return null
      row.stoppedAt = new Date()
      row.updatedAt = new Date()
      return row
    },
    async findByIdForTenant(sessionId: string, tenantId: string) {
      return findRowForTenant(sessionId, tenantId)
    },
    async findById(sessionId: string) {
      throwIfNotUuidShaped(sessionId)
      return rows.find((row) => row.id === sessionId) ?? null
    },
    async listForQuiz(quizId: string, tenantId: string) {
      throwIfNotUuidShaped(quizId)
      if (!quizBelongsToTenant(quizId, tenantId)) return null
      return rows.filter((row) => row.quizId === quizId).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    },
  }
}

/**
 * QUIZ-SESSION-LIVE-STATUS-001: mirrors the real repository's lack of a
 * tenant dimension (an anonymous student's phone has none) — `create`
 * only checks the session exists (via the sessions fake's own `rows`),
 * `markSubmitted` checks a connection belongs to the given session id.
 * Both still throw the wrapped `22P02` shape for a non-UUID-shaped id,
 * per ROUTE-ID-GUARD-001's pattern.
 */
export function createFakeConnectionRepository(sessions: SessionRepository & { rows: QuizSession[] }): ConnectionRepository & { rows: QuizSessionConnection[] } {
  const rows: QuizSessionConnection[] = []
  let nextId = 1

  return {
    rows,
    async create(sessionId: string) {
      throwIfNotUuidShaped(sessionId)
      if (!sessions.rows.some((row) => row.id === sessionId)) return null
      const created: QuizSessionConnection = { id: fakeUuid(nextId++), sessionId, connectedAt: new Date(), submittedAt: null, itemOrder: null, choiceOrder: null }
      rows.push(created)
      return created
    },
    async markSubmitted(connectionId: string, sessionId: string) {
      throwIfNotUuidShaped(connectionId)
      throwIfNotUuidShaped(sessionId)
      const row = rows.find((row) => row.id === connectionId && row.sessionId === sessionId)
      if (!row) return false
      row.submittedAt = new Date()
      return true
    },
    async countsForSession(sessionId: string) {
      const forSession = rows.filter((row) => row.sessionId === sessionId)
      return {
        joinedCount: forSession.length,
        submittedCount: forSession.filter((row) => row.submittedAt !== null).length,
      }
    },
    async belongsToSession(connectionId: string, sessionId: string) {
      throwIfNotUuidShaped(connectionId)
      throwIfNotUuidShaped(sessionId)
      return rows.some((row) => row.id === connectionId && row.sessionId === sessionId)
    },
    async listForSession(sessionId: string) {
      return rows.filter((row) => row.sessionId === sessionId)
    },
    async findForSession(connectionId: string, sessionId: string) {
      throwIfNotUuidShaped(connectionId)
      throwIfNotUuidShaped(sessionId)
      return rows.find((row) => row.id === connectionId && row.sessionId === sessionId) ?? null
    },
    async setOrderIfUnset(connectionId: string, itemOrder: string[], choiceOrder: Record<string, string[]>) {
      const row = rows.find((row) => row.id === connectionId)
      if (!row) return null
      // Mirrors the real repository's `UPDATE ... WHERE item_order IS NULL`
      // race-safety: a row that already has an order wins, this call never
      // overwrites it.
      if (row.itemOrder === null) {
        row.itemOrder = itemOrder
        row.choiceOrder = choiceOrder
      }
      return row
    },
  }
}

/**
 * QUIZ-TAKE-RENDER-001: in-memory fake for the answers table this story
 * owns — no tenant/session scoping of its own (the route layer already
 * checks the connection belongs to the session before calling `create`).
 */
export function createFakeQuizSessionAnswerRepository(): QuizSessionAnswerRepository & { rows: QuizSessionAnswer[] } {
  const rows: QuizSessionAnswer[] = []
  let nextId = 1

  return {
    rows,
    async create(answer: NewQuizSessionAnswer) {
      const created: QuizSessionAnswer = {
        id: fakeUuid(nextId++),
        connectionId: answer.connectionId,
        itemIdentifier: answer.itemIdentifier,
        itemPath: answer.itemPath,
        responses: answer.responses,
        gradingStatus: answer.gradingStatus,
        maxScore: answer.maxScore,
        score: null,
      }
      rows.push(created)
      return created
    },
    async listForConnection(connectionId: string) {
      return rows.filter((row) => row.connectionId === connectionId)
    },
    async markGraded(id: string, score: number) {
      const row = rows.find((row) => row.id === id && row.gradingStatus === ('pending' as GradingStatus))
      if (row) {
        row.score = score
        row.gradingStatus = 'graded'
      }
    },
  }
}

export function createTestSessionMiddleware() {
  return session({ secret: 'test-secret', resave: false, saveUninitialized: false, cookie: { secure: false } })
}

export async function signInAgent(
  users: UserRepository & { rows: UserForLogin[] },
  app: ReturnType<typeof createApp>,
  email: string,
) {
  const created = await users.create({ email, passwordHash: await hashPassword('correcthorse'), confirmedAt: null })
  await users.confirmUser(created.id)
  const agent = request.agent(app)
  await agent.post('/api/login').send({ email, password: 'correcthorse' })
  return agent
}
