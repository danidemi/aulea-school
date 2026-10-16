import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { eq, inArray } from 'drizzle-orm'
import { createSessionRepository, type QuizSession, type SessionRepository } from './quizSessions.js'
import { courses, quizSessionAnswers, quizSessionConnections, quizSessions, quizzes, tenants } from './schema.js'
import { startPostgres, type TestPostgres } from '../testSupport/postgresContainer.js'

// TEST-INTEGRATION-001 / ADR-0014: `deleteForQuiz` (SESSION-DELETE-001) on a real Postgres,
// for what the DB-free fake only mirrors: the row lock, the delete order and the tenant scoping.

const NOW = new Date('2026-10-16T10:00:00Z')
const isRunning = (session: QuizSession) =>
  session.startedAt !== null &&
  session.stoppedAt === null &&
  (session.closesAt === null || session.closesAt.getTime() > NOW.getTime())
const options = { dryRun: false, isRunning }

let pg: TestPostgres
let repository: SessionRepository

beforeAll(async () => {
  pg = await startPostgres()
  repository = createSessionRepository(pg.url, { db: pg.db, pool: pg.pool })
})

afterAll(async () => {
  await pg?.stop()
})

let counter = 0

/** A tenant with one course and one quiz; every test builds its own, so tests never see each other's rows. */
async function seedQuiz() {
  counter += 1
  const [tenant] = await pg.db.insert(tenants).values({ name: `tenant-${counter}` }).returning()
  const [course] = await pg.db.insert(courses).values({ tenantId: tenant.id, title: `course-${counter}` }).returning()
  const [quiz] = await pg.db
    .insert(quizzes)
    .values({ courseId: course.id, title: `quiz-${counter}`, fileName: 'quiz.zip' })
    .returning()
  return { tenantId: tenant.id, quizId: quiz.id }
}

/** A session with `connections` connections, each with `answersPerConnection` answers. `running` makes it started and not stopped. */
async function seedSession(quizId: string, { running = false, connections = 0, answersPerConnection = 0 } = {}) {
  const [session] = await pg.db
    .insert(quizSessions)
    .values({ quizId, startedAt: running ? new Date('2026-10-16T09:00:00Z') : null })
    .returning()
  for (let c = 0; c < connections; c++) {
    const [connection] = await pg.db.insert(quizSessionConnections).values({ sessionId: session.id }).returning()
    for (let a = 0; a < answersPerConnection; a++) {
      await pg.db.insert(quizSessionAnswers).values({
        connectionId: connection.id,
        itemIdentifier: `item-${a}`,
        itemPath: `items/item-${a}.xml`,
        gradingStatus: 'graded',
        maxScore: 1,
      })
    }
  }
  return session.id
}

async function remaining(sessionIds: string[]) {
  const rows = await pg.db.select({ id: quizSessions.id }).from(quizSessions).where(inArray(quizSessions.id, sessionIds))
  return rows.length
}

async function countRows(table: typeof quizSessionConnections | typeof quizSessionAnswers) {
  return (await pg.db.select().from(table)).length
}

describe('SessionRepository.deleteForQuiz on real Postgres', () => {
  it('deletes answers, connections and sessions in the right order, without a foreign-key error', async () => {
    // given: two sessions, each with two connections of three answers
    const { tenantId, quizId } = await seedQuiz()
    const a = await seedSession(quizId, { connections: 2, answersPerConnection: 3 })
    const b = await seedSession(quizId, { connections: 2, answersPerConnection: 3 })
    const connectionsBefore = await countRows(quizSessionConnections)
    const answersBefore = await countRows(quizSessionAnswers)

    // when: deleting both
    const result = await repository.deleteForQuiz(quizId, tenantId, [a, b], options)

    // then: the counts are reported and every dependent row is gone
    expect(result).toEqual({ outcome: 'ok', sessionCount: 2, answerCount: 12 })
    expect(await remaining([a, b])).toBe(0)
    expect(await countRows(quizSessionConnections)).toBe(connectionsBefore - 4)
    expect(await countRows(quizSessionAnswers)).toBe(answersBefore - 12)
  })

  it('rejects a running session and deletes nothing', async () => {
    // given: a stopped session and a running one
    const { tenantId, quizId } = await seedQuiz()
    const stopped = await seedSession(quizId, { connections: 1, answersPerConnection: 1 })
    const running = await seedSession(quizId, { running: true, connections: 1, answersPerConnection: 1 })

    // when: deleting both
    const result = await repository.deleteForQuiz(quizId, tenantId, [stopped, running], options)

    // then: it is refused as running and both sessions are still there
    expect(result).toEqual({ outcome: 'running' })
    expect(await remaining([stopped, running])).toBe(2)
  })

  it('answers not_found for a session of another tenant and deletes nothing', async () => {
    // given: a session owned by another tenant, and one of the caller's own
    const mine = await seedQuiz()
    const other = await seedQuiz()
    const own = await seedSession(mine.quizId)
    const foreign = await seedSession(other.quizId)

    // when: the caller tries to delete both through its own quiz
    const viaOwnQuiz = await repository.deleteForQuiz(mine.quizId, mine.tenantId, [own, foreign], options)
    // and tries to reach the foreign quiz directly with its own tenant
    const viaForeignQuiz = await repository.deleteForQuiz(other.quizId, mine.tenantId, [foreign], options)

    // then: both are not_found and nothing was deleted
    expect(viaOwnQuiz).toEqual({ outcome: 'not_found' })
    expect(viaForeignQuiz).toEqual({ outcome: 'not_found' })
    expect(await remaining([own, foreign])).toBe(2)
  })

  it('answers not_found for a session of another quiz of the same tenant and deletes nothing', async () => {
    // given: two quizzes of the same tenant, one session each
    const { tenantId, quizId } = await seedQuiz()
    const [course] = await pg.db.select().from(courses).innerJoin(quizzes, eq(quizzes.courseId, courses.id)).where(eq(quizzes.id, quizId))
    const [secondQuiz] = await pg.db
      .insert(quizzes)
      .values({ courseId: course.courses.id, title: 'second', fileName: 'second.zip' })
      .returning()
    const inFirst = await seedSession(quizId)
    const inSecond = await seedSession(secondQuiz.id)

    // when: asking the first quiz to delete the second quiz's session
    const result = await repository.deleteForQuiz(quizId, tenantId, [inFirst, inSecond], options)

    // then: not_found, and both sessions are still there
    expect(result).toEqual({ outcome: 'not_found' })
    expect(await remaining([inFirst, inSecond])).toBe(2)
  })

  it('reports the counts and deletes nothing on a dry run', async () => {
    // given: a session with two connections of two answers
    const { tenantId, quizId } = await seedQuiz()
    const id = await seedSession(quizId, { connections: 2, answersPerConnection: 2 })

    // when: running with dryRun
    const result = await repository.deleteForQuiz(quizId, tenantId, [id], { ...options, dryRun: true })

    // then: the counts are returned and every row is still there
    expect(result).toEqual({ outcome: 'ok', sessionCount: 1, answerCount: 4 })
    expect(await remaining([id])).toBe(1)
    const connections = await pg.db.select().from(quizSessionConnections).where(eq(quizSessionConnections.sessionId, id))
    expect(connections).toHaveLength(2)
  })

  it('deletes nothing when any one id fails (all-or-nothing)', async () => {
    // given: two valid sessions and an id that matches no session
    const { tenantId, quizId } = await seedQuiz()
    const a = await seedSession(quizId, { connections: 1, answersPerConnection: 1 })
    const b = await seedSession(quizId, { connections: 1, answersPerConnection: 1 })
    const missing = '00000000-0000-4000-8000-000000000000'

    // when: deleting them together with the missing one
    const result = await repository.deleteForQuiz(quizId, tenantId, [a, missing, b], options)

    // then: not_found, and the valid sessions with their children are untouched
    expect(result).toEqual({ outcome: 'not_found' })
    expect(await remaining([a, b])).toBe(2)
    const connections = await pg.db
      .select()
      .from(quizSessionConnections)
      .where(inArray(quizSessionConnections.sessionId, [a, b]))
    expect(connections).toHaveLength(2)
  })

  it('cannot delete a session that starts between the running check and the delete (row lock)', async () => {
    // given: a stopped (deletable) session, and an open transaction that has started it but not committed
    const { tenantId, quizId } = await seedQuiz()
    const id = await seedSession(quizId, { connections: 1, answersPerConnection: 1 })
    const starter = await pg.pool.connect()
    await starter.query('BEGIN')
    await starter.query('UPDATE quiz_sessions SET started_at = $1 WHERE id = $2', [new Date('2026-10-16T09:30:00Z'), id])

    // when: the delete begins while the start is in flight
    let settled = false
    const deletion = repository.deleteForQuiz(quizId, tenantId, [id], options).finally(() => {
      settled = true
    })
    await new Promise((resolve) => setTimeout(resolve, 500))

    // then: the delete is blocked on the row lock, not finished
    expect(settled).toBe(false)

    // when: the start commits
    await starter.query('COMMIT')
    starter.release()

    // then: the delete re-reads the committed row, sees it running, refuses, and the session survives
    expect(await deletion).toEqual({ outcome: 'running' })
    expect(await remaining([id])).toBe(1)
  })
})
