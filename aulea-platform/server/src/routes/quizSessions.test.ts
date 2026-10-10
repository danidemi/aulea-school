import { describe, it, expect, afterEach } from 'vitest'
import request from 'supertest'
import { createApp } from '../app.js'
import {
  createFakeUserRepository,
  createFakeTenantRepository,
  createFakeCourseRepository,
  createFakeQuizRepository,
  createFakeSessionRepository,
  createFakeConnectionRepository,
  createFakeQuizSessionAnswerRepository,
  createTestSessionMiddleware,
  signInAgent,
} from '../testSupport/fakes.js'
import { deriveStatus, parseTimeLimit, parseForceShuffle } from './quizSessions.js'
import { parseQtiXml } from '@longsightgroup/qti3-core'
import { zipOf, shuffledPackageEntries } from '../../test-fixtures/qti-samples/buildPackage.js'

// Covers QUIZ-SESSION-CONTROL-001's DoD
// (active_sprint/story_quiz_session_control.md): create/start/stop/reopen
// a quiz session, status derived on read (no stored status column, see
// deriveStatus's own doc comment), and ROUTE-ID-GUARD-001's guard pattern
// applied to every new id-in-URL route here from the start. Also covers
// QUIZ-SESSION-LIVE-STATUS-001's DoD
// (active_sprint/story_quiz_session_live_status.md): anonymous join/
// submit signals folded into this same session response as
// joinedCount/submittedCount.

function createTestApp() {
  const users = createFakeUserRepository()
  const tenants = createFakeTenantRepository()
  const courses = createFakeCourseRepository()
  const quizzes = createFakeQuizRepository(courses)
  const quizSessions = createFakeSessionRepository(quizzes, courses)
  const quizSessionConnections = createFakeConnectionRepository(quizSessions)
  const quizSessionAnswers = createFakeQuizSessionAnswerRepository()
  const app = createApp({ users, tenants, courses, quizzes, quizSessions, quizSessionConnections, quizSessionAnswers, sessionMiddleware: createTestSessionMiddleware() })
  return { app, users, courses, quizzes, quizSessions, quizSessionConnections, quizSessionAnswers }
}

async function createCourseAndQuiz(agent: ReturnType<typeof request.agent>) {
  const courseResponse = await agent.post('/api/courses').send({ title: 'Intro to Python' })
  const courseId = courseResponse.body.id as string
  const quizResponse = await agent
    .post(`/api/courses/${courseId}/quizzes`)
    .attach(
      'file',
      Buffer.from(
        `<qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" identifier="q1" title="Sample question"><qti-item-body><p>2+2?</p></qti-item-body></qti-assessment-item>`,
      ),
      'quiz.xml',
    )
  return { courseId, quizId: quizResponse.body.id as string }
}

const ORIGINAL_APP_BASE_URL = process.env.APP_BASE_URL

afterEach(() => {
  process.env.APP_BASE_URL = ORIGINAL_APP_BASE_URL
})

// Covers BUG-BREADCRUMB-NAV's new endpoint (active_sprint/bug_breadcrumb_inconsistent_and_missing.md):
// resolves a bare quizId to its title + course, tenant-scoped, for the
// shared breadcrumb component.
describe('GET /api/quizzes/:quizId (BUG-BREADCRUMB-NAV)', () => {
  it('returns 401 when not signed in', async () => {
    // given: no session
    const { app } = createTestApp()

    // when: fetching a quiz with no signed-in agent
    const response = await request(app).get('/api/quizzes/some-id')

    // then: 401, not a lookup attempt
    expect(response.status).toBe(401)
  })

  it('returns the quiz title, courseId, and course title', async () => {
    // given: a signed-in trainer with a course and quiz
    const { app, users } = createTestApp()
    const agent = await signInAgent(users, app, 'trainer@example.com')
    const { courseId, quizId } = await createCourseAndQuiz(agent)

    // when: fetching that quiz by id
    const response = await agent.get(`/api/quizzes/${quizId}`)

    // then: its title plus its course's id/title are returned
    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({ id: quizId, title: 'Sample question', courseId, courseTitle: 'Intro to Python' })
  })

  it('returns 404 for a quiz belonging to a different tenant', async () => {
    // given: tenant A's quiz
    const { app, users } = createTestApp()
    const agentA = await signInAgent(users, app, 'trainer-a@example.com')
    const { quizId } = await createCourseAndQuiz(agentA)
    const agentB = await signInAgent(users, app, 'trainer-b@example.com')

    // when: tenant B fetches it
    const response = await agentB.get(`/api/quizzes/${quizId}`)

    // then: 404, not 403 — doesn't confirm the quiz exists at all
    expect(response.status).toBe(404)
    expect(response.body).toEqual({ error: 'quiz_not_found' })
  })

  it('returns 404 for an unknown quiz id', async () => {
    // given: a signed-in trainer, no quiz with this id
    const { app, users } = createTestApp()
    const agent = await signInAgent(users, app, 'trainer@example.com')

    // when: fetching a UUID-shaped id that matches no row
    const response = await agent.get('/api/quizzes/00000000-0000-4000-8000-000000000000')

    // then: 404
    expect(response.status).toBe(404)
  })

  it('returns 404 for a malformed quiz id, not a 500', async () => {
    // given: a signed-in trainer
    const { app, users } = createTestApp()
    const agent = await signInAgent(users, app, 'trainer@example.com')

    // when: fetching a non-UUID-shaped id (ROUTE-ID-GUARD-001)
    const response = await agent.get('/api/quizzes/not-a-uuid')

    // then: folded into the same 404, not an uncaught 500
    expect(response.status).toBe(404)
  })
})

describe('deriveStatus (pure)', () => {
  const now = new Date('2026-08-23T12:00:00Z')

  it('is closed when never started', () => {
    // given: a session that was never started
    const session = { startedAt: null, closesAt: null, stoppedAt: null }
    // then: it is closed
    expect(deriveStatus(session, now)).toBe('closed')
  })

  it('is running once started with no limit', () => {
    const session = { startedAt: new Date('2026-08-23T11:00:00Z'), closesAt: null, stoppedAt: null }
    expect(deriveStatus(session, now)).toBe('running')
  })

  it('is running while the deadline has not passed', () => {
    const session = { startedAt: new Date('2026-08-23T11:00:00Z'), closesAt: new Date('2026-08-23T13:00:00Z'), stoppedAt: null }
    expect(deriveStatus(session, now)).toBe('running')
  })

  it('is stopped once the deadline has passed, with no explicit stop', () => {
    const session = { startedAt: new Date('2026-08-23T11:00:00Z'), closesAt: new Date('2026-08-23T11:30:00Z'), stoppedAt: null }
    expect(deriveStatus(session, now)).toBe('stopped')
  })

  it('is stopped once explicitly stopped', () => {
    const session = { startedAt: new Date('2026-08-23T11:00:00Z'), closesAt: null, stoppedAt: new Date('2026-08-23T11:45:00Z') }
    expect(deriveStatus(session, now)).toBe('stopped')
  })
})

describe('parseTimeLimit (pure)', () => {
  it('accepts hours', () => {
    expect(parseTimeLimit('3h')).toBe(3 * 3600)
  })

  it('accepts minutes', () => {
    expect(parseTimeLimit('75m')).toBe(75 * 60)
  })

  it('is case-insensitive', () => {
    expect(parseTimeLimit('2H')).toBe(2 * 3600)
  })

  it('treats an omitted value as no limit', () => {
    expect(parseTimeLimit(undefined)).toBeNull()
    expect(parseTimeLimit('')).toBeNull()
  })

  it.each(['banana', '0m', '-5h', '5', 'h', '5x'])('rejects %s as invalid', (input) => {
    expect(parseTimeLimit(input)).toBe('invalid')
  })
})

describe('parseForceShuffle (pure)', () => {
  it('treats an omitted/null value as false (no trainer action required)', () => {
    expect(parseForceShuffle(undefined)).toBe(false)
    expect(parseForceShuffle(null)).toBe(false)
  })

  it('accepts true/false', () => {
    expect(parseForceShuffle(true)).toBe(true)
    expect(parseForceShuffle(false)).toBe(false)
  })

  it.each(['true', 1, 0, 'false'])('rejects a non-boolean %s as invalid', (input) => {
    expect(parseForceShuffle(input)).toBe('invalid')
  })
})

describe('POST /api/quizzes/:quizId/sessions', () => {
  it('returns 401 when not signed in', async () => {
    const { app } = createTestApp()
    const response = await request(app).post('/api/quizzes/some-id/sessions')
    expect(response.status).toBe(401)
  })

  it('creates a closed session for a quiz the caller owns', async () => {
    // given: a signed-in trainer with a quiz
    const { app, users } = createTestApp()
    const agent = await signInAgent(users, app, 'trainer@example.com')
    const { quizId } = await createCourseAndQuiz(agent)

    // when: creating a session for it
    const response = await agent.post(`/api/quizzes/${quizId}/sessions`)

    // then: a closed session is created, with a take URL
    expect(response.status).toBe(201)
    expect(response.body.status).toBe('closed')
    expect(response.body.quizId).toBe(quizId)
    expect(response.body.takeUrl).toContain(`/quiz-sessions/${response.body.id}/take`)
  })

  it('returns 404 for a quiz belonging to a different tenant', async () => {
    const { app, users } = createTestApp()
    const agentA = await signInAgent(users, app, 'trainer-a@example.com')
    const { quizId } = await createCourseAndQuiz(agentA)
    const agentB = await signInAgent(users, app, 'trainer-b@example.com')

    const response = await agentB.post(`/api/quizzes/${quizId}/sessions`)

    expect(response.status).toBe(404)
  })

  it('returns 404, not a crash, for a malformed quiz id (ROUTE-ID-GUARD-001 pattern)', async () => {
    const { app, users } = createTestApp()
    const agent = await signInAgent(users, app, 'trainer@example.com')

    const response = await agent.post('/api/quizzes/does-not-exist/sessions')

    expect(response.status).toBe(404)
  })
})

describe('GET /api/quizzes/:quizId/sessions (QUIZ-SESSION-HISTORY-001)', () => {
  it('returns 401 when not signed in', async () => {
    const { app } = createTestApp()
    const response = await request(app).get('/api/quizzes/some-id/sessions')
    expect(response.status).toBe(401)
  })

  it('returns an empty list for a quiz with no sessions yet', async () => {
    const { app, users } = createTestApp()
    const agent = await signInAgent(users, app, 'trainer@example.com')
    const { quizId } = await createCourseAndQuiz(agent)

    const response = await agent.get(`/api/quizzes/${quizId}/sessions`)

    expect(response.status).toBe(200)
    expect(response.body).toEqual([])
  })

  it('returns every session for the quiz, newest first', async () => {
    const { app, users } = createTestApp()
    const agent = await signInAgent(users, app, 'trainer@example.com')
    const { quizId } = await createCourseAndQuiz(agent)

    const first = await agent.post(`/api/quizzes/${quizId}/sessions`)
    const second = await agent.post(`/api/quizzes/${quizId}/sessions`)

    const response = await agent.get(`/api/quizzes/${quizId}/sessions`)

    expect(response.status).toBe(200)
    expect(response.body.map((session: { id: string }) => session.id)).toEqual([second.body.id, first.body.id])
  })

  it('includes joined/submitted counts per session', async () => {
    const { app, users } = createTestApp()
    const agent = await signInAgent(users, app, 'trainer@example.com')
    const { quizId } = await createCourseAndQuiz(agent)
    const created = await agent.post(`/api/quizzes/${quizId}/sessions`)
    await request(app).post(`/api/quiz-sessions/${created.body.id}/connections`)

    const response = await agent.get(`/api/quizzes/${quizId}/sessions`)

    expect(response.body[0].joinedCount).toBe(1)
    expect(response.body[0].submittedCount).toBe(0)
  })

  it('returns 404 for a quiz belonging to a different tenant', async () => {
    const { app, users } = createTestApp()
    const agentA = await signInAgent(users, app, 'trainer-a@example.com')
    const { quizId } = await createCourseAndQuiz(agentA)
    const agentB = await signInAgent(users, app, 'trainer-b@example.com')

    const response = await agentB.get(`/api/quizzes/${quizId}/sessions`)

    expect(response.status).toBe(404)
  })

  it('returns 404, not a crash, for a malformed quiz id (ROUTE-ID-GUARD-001 pattern)', async () => {
    const { app, users } = createTestApp()
    const agent = await signInAgent(users, app, 'trainer@example.com')

    const response = await agent.get('/api/quizzes/does-not-exist/sessions')

    expect(response.status).toBe(404)
  })
})

describe('POST /api/quiz-sessions/:sessionId/start', () => {
  async function createSession(agent: ReturnType<typeof request.agent>) {
    const { quizId } = await createCourseAndQuiz(agent)
    const created = await agent.post(`/api/quizzes/${quizId}/sessions`)
    return created.body.id as string
  }

  it('starts a session with a time limit', async () => {
    // given: a closed session
    const { app, users } = createTestApp()
    const agent = await signInAgent(users, app, 'trainer@example.com')
    const sessionId = await createSession(agent)

    // when: starting it with a 75-minute limit
    const response = await agent.post(`/api/quiz-sessions/${sessionId}/start`).send({ timeLimit: '75m' })

    // then: it is running, with a computed close time
    expect(response.status).toBe(200)
    expect(response.body.status).toBe('running')
    expect(response.body.timeLimitSeconds).toBe(75 * 60)
    expect(response.body.closesAt).not.toBeNull()
  })

  it('starts a session with no time limit', async () => {
    const { app, users } = createTestApp()
    const agent = await signInAgent(users, app, 'trainer@example.com')
    const sessionId = await createSession(agent)

    const response = await agent.post(`/api/quiz-sessions/${sessionId}/start`).send({})

    expect(response.status).toBe(200)
    expect(response.body.status).toBe('running')
    expect(response.body.closesAt).toBeNull()
  })

  it('defaults forceShuffleQuestions/forceShuffleAnswers to false when omitted (QUIZ-SESSION-PER-STUDENT-DELIVERY-001)', async () => {
    const { app, users } = createTestApp()
    const agent = await signInAgent(users, app, 'trainer@example.com')
    const sessionId = await createSession(agent)

    const response = await agent.post(`/api/quiz-sessions/${sessionId}/start`).send({})

    expect(response.body.forceShuffleQuestions).toBe(false)
    expect(response.body.forceShuffleAnswers).toBe(false)
  })

  it('sets forceShuffleQuestions/forceShuffleAnswers from the body, alongside timeLimit', async () => {
    const { app, users } = createTestApp()
    const agent = await signInAgent(users, app, 'trainer@example.com')
    const sessionId = await createSession(agent)

    const response = await agent.post(`/api/quiz-sessions/${sessionId}/start`).send({ timeLimit: '10m', forceShuffleQuestions: true, forceShuffleAnswers: false })

    expect(response.status).toBe(200)
    expect(response.body.forceShuffleQuestions).toBe(true)
    expect(response.body.forceShuffleAnswers).toBe(false)
  })

  it('returns 400 for a non-boolean forceShuffleQuestions', async () => {
    const { app, users } = createTestApp()
    const agent = await signInAgent(users, app, 'trainer@example.com')
    const sessionId = await createSession(agent)

    const response = await agent.post(`/api/quiz-sessions/${sessionId}/start`).send({ forceShuffleQuestions: 'yes' })

    expect(response.status).toBe(400)
  })

  it('returns 400 for a non-boolean forceShuffleAnswers', async () => {
    const { app, users } = createTestApp()
    const agent = await signInAgent(users, app, 'trainer@example.com')
    const sessionId = await createSession(agent)

    const response = await agent.post(`/api/quiz-sessions/${sessionId}/start`).send({ forceShuffleAnswers: 1 })

    expect(response.status).toBe(400)
  })

  it('returns 400 for an unparseable time limit', async () => {
    const { app, users } = createTestApp()
    const agent = await signInAgent(users, app, 'trainer@example.com')
    const sessionId = await createSession(agent)

    const response = await agent.post(`/api/quiz-sessions/${sessionId}/start`).send({ timeLimit: 'banana' })

    expect(response.status).toBe(400)
  })

  it('reopens a stopped session, resetting the deadline', async () => {
    // given: a session that was started and stopped
    const { app, users } = createTestApp()
    const agent = await signInAgent(users, app, 'trainer@example.com')
    const sessionId = await createSession(agent)
    await agent.post(`/api/quiz-sessions/${sessionId}/start`).send({ timeLimit: '10m' })
    await agent.post(`/api/quiz-sessions/${sessionId}/stop`)

    // when: starting it again with a different limit
    const response = await agent.post(`/api/quiz-sessions/${sessionId}/start`).send({ timeLimit: '30m' })

    // then: it is running again, not stuck as stopped
    expect(response.status).toBe(200)
    expect(response.body.status).toBe('running')
    expect(response.body.timeLimitSeconds).toBe(30 * 60)
    expect(response.body.stoppedAt).toBeNull()
  })

  it('returns 404, not a crash, for a malformed session id', async () => {
    const { app, users } = createTestApp()
    const agent = await signInAgent(users, app, 'trainer@example.com')

    const response = await agent.post('/api/quiz-sessions/does-not-exist/start')

    expect(response.status).toBe(404)
  })
})

describe('POST /api/quiz-sessions/:sessionId/stop', () => {
  it('stops a running session', async () => {
    // given: a running session
    const { app, users } = createTestApp()
    const agent = await signInAgent(users, app, 'trainer@example.com')
    const { quizId } = await createCourseAndQuiz(agent)
    const created = await agent.post(`/api/quizzes/${quizId}/sessions`)
    await agent.post(`/api/quiz-sessions/${created.body.id}/start`).send({})

    // when: stopping it
    const response = await agent.post(`/api/quiz-sessions/${created.body.id}/stop`)

    // then: it is stopped
    expect(response.status).toBe(200)
    expect(response.body.status).toBe('stopped')
  })

  it('returns 404 for a session belonging to a different tenant', async () => {
    const { app, users } = createTestApp()
    const agentA = await signInAgent(users, app, 'trainer-a@example.com')
    const { quizId } = await createCourseAndQuiz(agentA)
    const created = await agentA.post(`/api/quizzes/${quizId}/sessions`)
    const agentB = await signInAgent(users, app, 'trainer-b@example.com')

    const response = await agentB.post(`/api/quiz-sessions/${created.body.id}/stop`)

    expect(response.status).toBe(404)
  })
})

describe('GET /api/quiz-sessions/:sessionId', () => {
  it('returns 401 when not signed in', async () => {
    const { app } = createTestApp()
    const response = await request(app).get('/api/quiz-sessions/some-id')
    expect(response.status).toBe(401)
  })

  it('auto-derives stopped once the deadline has passed, without an explicit stop', async () => {
    // given: a session started with a short limit, whose deadline is
    // manipulated (via the fake's exposed rows) to already be in the past
    const { app, users, quizSessions } = createTestApp()
    const agent = await signInAgent(users, app, 'trainer@example.com')
    const { quizId } = await createCourseAndQuiz(agent)
    const created = await agent.post(`/api/quizzes/${quizId}/sessions`)
    await agent.post(`/api/quiz-sessions/${created.body.id}/start`).send({ timeLimit: '10m' })
    const row = quizSessions.rows.find((row) => row.id === created.body.id)
    if (row) row.closesAt = new Date(Date.now() - 1000)

    // when: fetching it
    const response = await agent.get(`/api/quiz-sessions/${created.body.id}`)

    // then: it reports stopped, without anything having called .../stop
    expect(response.status).toBe(200)
    expect(response.body.status).toBe('stopped')
  })

  it('uses APP_BASE_URL for takeUrl, not request-derived context', async () => {
    // given: a custom APP_BASE_URL
    process.env.APP_BASE_URL = 'https://learning.example.com'
    const { app, users } = createTestApp()
    const agent = await signInAgent(users, app, 'trainer@example.com')
    const { quizId } = await createCourseAndQuiz(agent)
    const created = await agent.post(`/api/quizzes/${quizId}/sessions`)

    // when: fetching the session
    const response = await agent.get(`/api/quiz-sessions/${created.body.id}`)

    // then: takeUrl is built from the configured base URL
    expect(response.body.takeUrl).toBe(`https://learning.example.com/quiz-sessions/${created.body.id}/take`)
  })

  it('returns 404, not a crash, for a malformed session id', async () => {
    const { app, users } = createTestApp()
    const agent = await signInAgent(users, app, 'trainer@example.com')

    const response = await agent.get('/api/quiz-sessions/does-not-exist')

    expect(response.status).toBe(404)
  })
})

describe('POST /api/quiz-sessions/:sessionId/connections (QUIZ-SESSION-LIVE-STATUS-001)', () => {
  it('joins a session with no session/tenant of any kind, even before it is started', async () => {
    // given: a trainer's closed session
    const { app, users } = createTestApp()
    const agent = await signInAgent(users, app, 'trainer@example.com')
    const { quizId } = await createCourseAndQuiz(agent)
    const created = await agent.post(`/api/quizzes/${quizId}/sessions`)

    // when: an anonymous request (no cookies at all) joins it
    const response = await request(app).post(`/api/quiz-sessions/${created.body.id}/connections`)

    // then: it succeeds
    expect(response.status).toBe(201)
    expect(response.body.id).toBeTruthy()

    // and: the trainer's own session view reflects the join
    const sessionResponse = await agent.get(`/api/quiz-sessions/${created.body.id}`)
    expect(sessionResponse.body.joinedCount).toBe(1)
  })

  it('returns 404, not a crash, for a malformed session id', async () => {
    const { app } = createTestApp()
    const response = await request(app).post('/api/quiz-sessions/does-not-exist/connections')
    expect(response.status).toBe(404)
  })

  it('returns 404 for a session id that does not exist', async () => {
    const { app } = createTestApp()
    const response = await request(app).post('/api/quiz-sessions/00000000-0000-4000-8000-000000000999/connections')
    expect(response.status).toBe(404)
  })
})

describe('POST /api/quiz-sessions/:sessionId/connections rejects a stopped session (QUIZ-CONNECTION-INTEGRITY-001)', () => {
  it('returns 409 and creates no connection once the session is stopped', async () => {
    // given: a session that was started and then stopped
    const { app, users } = createTestApp()
    const agent = await signInAgent(users, app, 'trainer@example.com')
    const { quizId } = await createCourseAndQuiz(agent)
    const created = await agent.post(`/api/quizzes/${quizId}/sessions`)
    const sessionId = created.body.id as string
    await agent.post(`/api/quiz-sessions/${sessionId}/start`).send({})
    await agent.post(`/api/quiz-sessions/${sessionId}/stop`)

    // when: a new anonymous join is attempted
    const response = await request(app).post(`/api/quiz-sessions/${sessionId}/connections`)

    // then: it is rejected, not silently accepted
    expect(response.status).toBe(409)
    expect(response.body).toEqual({ error: 'session_not_running', status: 'stopped' })

    // and: no ghost connection was created — joinedCount is unaffected
    const sessionResponse = await agent.get(`/api/quiz-sessions/${sessionId}`)
    expect(sessionResponse.body.joinedCount).toBe(0)
  })

  it('still accepts a join while closed (pre-start lobby, unchanged)', async () => {
    const { app, users } = createTestApp()
    const agent = await signInAgent(users, app, 'trainer@example.com')
    const { quizId } = await createCourseAndQuiz(agent)
    const created = await agent.post(`/api/quizzes/${quizId}/sessions`)

    const response = await request(app).post(`/api/quiz-sessions/${created.body.id}/connections`)

    expect(response.status).toBe(201)
  })

  it('still accepts a join while running (unchanged)', async () => {
    const { app, users } = createTestApp()
    const agent = await signInAgent(users, app, 'trainer@example.com')
    const { quizId } = await createCourseAndQuiz(agent)
    const created = await agent.post(`/api/quizzes/${quizId}/sessions`)
    const sessionId = created.body.id as string
    await agent.post(`/api/quiz-sessions/${sessionId}/start`).send({})

    const response = await request(app).post(`/api/quiz-sessions/${sessionId}/connections`)

    expect(response.status).toBe(201)
  })
})

describe('POST /api/quiz-sessions/:sessionId/connections/:connectionId/submit (QUIZ-SESSION-LIVE-STATUS-001)', () => {
  async function createSessionAndJoin(agent: ReturnType<typeof request.agent>, app: ReturnType<typeof createTestApp>['app']) {
    const { quizId } = await createCourseAndQuiz(agent)
    const created = await agent.post(`/api/quizzes/${quizId}/sessions`)
    const joined = await request(app).post(`/api/quiz-sessions/${created.body.id}/connections`)
    return { sessionId: created.body.id as string, connectionId: joined.body.id as string }
  }

  it('marks a connection as submitted, reflected in the trainer session view', async () => {
    // given: a session with one joined connection
    const { app, users } = createTestApp()
    const agent = await signInAgent(users, app, 'trainer@example.com')
    const { sessionId, connectionId } = await createSessionAndJoin(agent, app)

    // when: the anonymous student submits
    const response = await request(app).post(`/api/quiz-sessions/${sessionId}/connections/${connectionId}/submit`)

    // then: it succeeds, and the trainer sees it counted
    expect(response.status).toBe(200)
    const sessionResponse = await agent.get(`/api/quiz-sessions/${sessionId}`)
    expect(sessionResponse.body.joinedCount).toBe(1)
    expect(sessionResponse.body.submittedCount).toBe(1)
  })

  it('returns 404 for a connection that does not belong to the given session', async () => {
    const { app, users } = createTestApp()
    const agent = await signInAgent(users, app, 'trainer@example.com')
    const { connectionId } = await createSessionAndJoin(agent, app)
    const { sessionId: otherSessionId } = await createSessionAndJoin(agent, app)

    const response = await request(app).post(`/api/quiz-sessions/${otherSessionId}/connections/${connectionId}/submit`)

    expect(response.status).toBe(404)
  })

  it('returns 404, not a crash, for a malformed connection id', async () => {
    const { app, users } = createTestApp()
    const agent = await signInAgent(users, app, 'trainer@example.com')
    const { sessionId } = await createSessionAndJoin(agent, app)

    const response = await request(app).post(`/api/quiz-sessions/${sessionId}/connections/does-not-exist/submit`)

    expect(response.status).toBe(404)
  })
})

const CHOICE_ITEM = `<qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" identifier="single-choice-basic" title="Capital of France" adaptive="false" time-dependent="false">
  <qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="identifier">
    <qti-correct-response><qti-value>choice_b</qti-value></qti-correct-response>
  </qti-response-declaration>
  <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float"><qti-default-value><qti-value>0</qti-value></qti-default-value></qti-outcome-declaration>
  <qti-item-body>
    <qti-choice-interaction response-identifier="RESPONSE" shuffle="false" max-choices="1">
      <qti-simple-choice identifier="choice_a">Berlin</qti-simple-choice>
      <qti-simple-choice identifier="choice_b">Paris</qti-simple-choice>
    </qti-choice-interaction>
  </qti-item-body>
  <qti-response-processing template="https://purl.imsglobal.org/spec/qti/v3p0/rptemplates/match_correct"/>
</qti-assessment-item>`

const UNSUPPORTED_ITEM = `<qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" identifier="text-entry-unsupported" title="Capital of Italy">
  <qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="string">
    <qti-correct-response><qti-value>Rome</qti-value></qti-correct-response>
  </qti-response-declaration>
  <qti-item-body>
    <qti-text-entry-interaction response-identifier="RESPONSE"/>
  </qti-item-body>
</qti-assessment-item>`

async function createCourseAndQuizWithItem(agent: ReturnType<typeof request.agent>, xml: string, fileName = 'quiz.xml') {
  const courseResponse = await agent.post('/api/courses').send({ title: `Course for ${fileName}` })
  const courseId = courseResponse.body.id as string
  const quizResponse = await agent.post(`/api/courses/${courseId}/quizzes`).attach('file', Buffer.from(xml), fileName)
  return { courseId, quizId: quizResponse.body.id as string }
}

// Covers QUIZ-TAKE-RENDER-001's DoD (active_sprint/story_quiz_take_render.md):
// anonymous status/items/answers routes the take page depends on.
describe('GET /api/quiz-sessions/:sessionId/status (QUIZ-TAKE-RENDER-001)', () => {
  it('reports closed/running/stopped with no tenant of any kind', async () => {
    const { app, users } = createTestApp()
    const agent = await signInAgent(users, app, 'trainer@example.com')
    const { quizId } = await createCourseAndQuizWithItem(agent, CHOICE_ITEM)
    const created = await agent.post(`/api/quizzes/${quizId}/sessions`)
    const sessionId = created.body.id as string

    expect((await request(app).get(`/api/quiz-sessions/${sessionId}/status`)).body).toEqual({ status: 'closed' })

    await agent.post(`/api/quiz-sessions/${sessionId}/start`).send({})
    expect((await request(app).get(`/api/quiz-sessions/${sessionId}/status`)).body).toEqual({ status: 'running' })

    await agent.post(`/api/quiz-sessions/${sessionId}/stop`)
    expect((await request(app).get(`/api/quiz-sessions/${sessionId}/status`)).body).toEqual({ status: 'stopped' })
  })

  it('returns 404, not a crash, for a malformed session id', async () => {
    const { app } = createTestApp()
    const response = await request(app).get('/api/quiz-sessions/does-not-exist/status')
    expect(response.status).toBe(404)
  })
})

describe('GET /api/quiz-sessions/:sessionId/connections/:connectionId/items (QUIZ-TAKE-RENDER-001, replaced by QUIZ-SESSION-PER-STUDENT-DELIVERY-001)', () => {
  async function createRunningSession(agent: ReturnType<typeof request.agent>, xml: string, options?: { forceShuffleQuestions?: boolean; forceShuffleAnswers?: boolean }, fileName = 'quiz.xml') {
    const { quizId } = await createCourseAndQuizWithItem(agent, xml, fileName)
    const created = await agent.post(`/api/quizzes/${quizId}/sessions`)
    const sessionId = created.body.id as string
    await agent.post(`/api/quiz-sessions/${sessionId}/start`).send(options ?? {})
    return sessionId
  }

  async function createRunningPackageSession(agent: ReturnType<typeof request.agent>, zip: Buffer, options?: { forceShuffleQuestions?: boolean; forceShuffleAnswers?: boolean }, fileName = 'quiz.zip') {
    const courseResponse = await agent.post('/api/courses').send({ title: `Course for ${fileName}` })
    const courseId = courseResponse.body.id as string
    const quizResponse = await agent.post(`/api/courses/${courseId}/quizzes`).attach('file', zip, fileName)
    const quizId = quizResponse.body.id as string
    const created = await agent.post(`/api/quizzes/${quizId}/sessions`)
    const sessionId = created.body.id as string
    await agent.post(`/api/quiz-sessions/${sessionId}/start`).send(options ?? {})
    return sessionId
  }

  async function join(app: ReturnType<typeof createTestApp>['app'], sessionId: string) {
    const joined = await request(app).post(`/api/quiz-sessions/${sessionId}/connections`)
    return joined.body.id as string
  }

  it('resolves a standalone single-item quiz, marked supported', async () => {
    const { app, users } = createTestApp()
    const agent = await signInAgent(users, app, 'trainer@example.com')
    const sessionId = await createRunningSession(agent, CHOICE_ITEM)
    const connectionId = await join(app, sessionId)

    const response = await request(app).get(`/api/quiz-sessions/${sessionId}/connections/${connectionId}/items`)

    expect(response.status).toBe(200)
    expect(response.body.items).toHaveLength(1)
    expect(response.body.items[0]).toMatchObject({ identifier: 'single-choice-basic', supported: true })
  })

  it('marks a non-choice-interaction item unsupported, not a crash', async () => {
    const { app, users } = createTestApp()
    const agent = await signInAgent(users, app, 'trainer@example.com')
    const sessionId = await createRunningSession(agent, UNSUPPORTED_ITEM)
    const connectionId = await join(app, sessionId)

    const response = await request(app).get(`/api/quiz-sessions/${sessionId}/connections/${connectionId}/items`)

    expect(response.status).toBe(200)
    expect(response.body.items[0]).toMatchObject({ identifier: 'text-entry-unsupported', supported: false })
  })

  it('returns 409 while not running, not the questions', async () => {
    const { app, users } = createTestApp()
    const agent = await signInAgent(users, app, 'trainer@example.com')
    const { quizId } = await createCourseAndQuizWithItem(agent, CHOICE_ITEM)
    const created = await agent.post(`/api/quizzes/${quizId}/sessions`)
    const connectionId = await join(app, created.body.id)

    const response = await request(app).get(`/api/quiz-sessions/${created.body.id}/connections/${connectionId}/items`)

    expect(response.status).toBe(409)
    expect(response.body.status).toBe('closed')
  })

  it('returns 404, not a crash, for a malformed session id', async () => {
    const { app } = createTestApp()
    const response = await request(app).get('/api/quiz-sessions/does-not-exist/connections/does-not-exist/items')
    expect(response.status).toBe(404)
  })

  it('returns 404 for a connection that does not belong to this session', async () => {
    // given: two separate running sessions, each with their own connection
    const { app, users } = createTestApp()
    const agent = await signInAgent(users, app, 'trainer@example.com')
    const sessionA = await createRunningSession(agent, CHOICE_ITEM, undefined, 'quiz-a.xml')
    const sessionB = await createRunningSession(agent, CHOICE_ITEM, undefined, 'quiz-b.xml')
    const connectionForA = await join(app, sessionA)

    // when: fetching sessionB's items using sessionA's connection id
    const response = await request(app).get(`/api/quiz-sessions/${sessionB}/connections/${connectionForA}/items`)

    // then: rejected, not silently served
    expect(response.status).toBe(404)
    expect(response.body.error).toBe('connection_not_found')
  })

  it("is stable across repeated fetches for the same connection (the DoD's 'generated once, persisted' requirement)", async () => {
    const { app, users, quizSessionConnections } = createTestApp()
    const agent = await signInAgent(users, app, 'trainer@example.com')
    const sessionId = await createRunningPackageSession(agent, zipOf(shuffledPackageEntries()), { forceShuffleQuestions: true, forceShuffleAnswers: true })
    const connectionId = await join(app, sessionId)

    const first = await request(app).get(`/api/quiz-sessions/${sessionId}/connections/${connectionId}/items`)
    const second = await request(app).get(`/api/quiz-sessions/${sessionId}/connections/${connectionId}/items`)

    expect(first.body.items.map((i: { identifier: string }) => i.identifier)).toEqual(second.body.items.map((i: { identifier: string }) => i.identifier))
    expect(first.body.items).toEqual(second.body.items)

    // and: the persisted row itself carries that same order — proving
    // "persisted", not just "the handler happens to return the same thing
    // twice" (e.g. if generation were idempotent by coincidence).
    const persistedRow = quizSessionConnections.rows.find((row) => row.id === connectionId)
    expect(persistedRow?.itemOrder).not.toBeNull()
    expect(persistedRow?.itemOrder).toEqual(first.body.items.map((i: { identifier: string }) => i.identifier))
  })

  it('two concurrent first-fetches for the same connection return identical items (the atomic setOrderIfUnset write is proven separately, at the db layer, against real Postgres — not exercisable with this in-process fake)', async () => {
    const { app, users } = createTestApp()
    const agent = await signInAgent(users, app, 'trainer@example.com')
    const sessionId = await createRunningPackageSession(agent, zipOf(shuffledPackageEntries()), { forceShuffleQuestions: true, forceShuffleAnswers: true })
    const connectionId = await join(app, sessionId)

    const [first, second] = await Promise.all([
      request(app).get(`/api/quiz-sessions/${sessionId}/connections/${connectionId}/items`),
      request(app).get(`/api/quiz-sessions/${sessionId}/connections/${connectionId}/items`),
    ])

    expect(first.body.items).toEqual(second.body.items)
  })

  it('two different connections in the same shuffled session are independently generated (each gets its own order call)', async () => {
    const { app, users } = createTestApp()
    const agent = await signInAgent(users, app, 'trainer@example.com')
    const sessionId = await createRunningPackageSession(agent, zipOf(shuffledPackageEntries()), { forceShuffleQuestions: true, forceShuffleAnswers: true })
    const connectionA = await join(app, sessionId)
    const connectionB = await join(app, sessionId)

    const responseA = await request(app).get(`/api/quiz-sessions/${sessionId}/connections/${connectionA}/items`)
    const responseB = await request(app).get(`/api/quiz-sessions/${sessionId}/connections/${connectionB}/items`)

    // Same set of items served to both (nothing lost/duplicated) — not
    // asserting the two orders differ, since that isn't guaranteed by a
    // real RNG (DoD's own wording: "not guaranteed distinct, but generated
    // independently").
    const idsA = responseA.body.items.map((i: { identifier: string }) => i.identifier).sort()
    const idsB = responseB.body.items.map((i: { identifier: string }) => i.identifier).sort()
    expect(idsA).toEqual(idsB)
  })

  it('force off: honors each authored shuffle attribute — an authored shuffle="false" item stays byte-identical', async () => {
    const { app, users, quizzes } = createTestApp()
    const agent = await signInAgent(users, app, 'trainer@example.com')
    const sessionId = await createRunningPackageSession(agent, zipOf(shuffledPackageEntries()), { forceShuffleQuestions: false, forceShuffleAnswers: false })
    const connectionId = await join(app, sessionId)

    const response = await request(app).get(`/api/quiz-sessions/${sessionId}/connections/${connectionId}/items`)

    const served = response.body.items.find((i: { identifier: string }) => i.identifier === 'choice-shuffle-false')
    const sourceFile = quizzes.fileRows.find((f) => f.relativePath === 'sample-shuffle-choice-shuffle-false.xml')
    expect(served.xml).toBe(sourceFile?.fileData.toString('utf-8'))
  })

  it('force on: shuffles an authored shuffle="false" item too, still parseable with the same identifier and choice set', async () => {
    const { app, users, quizzes } = createTestApp()
    const agent = await signInAgent(users, app, 'trainer@example.com')
    const sessionId = await createRunningPackageSession(agent, zipOf(shuffledPackageEntries()), { forceShuffleQuestions: false, forceShuffleAnswers: true })
    const connectionId = await join(app, sessionId)

    const response = await request(app).get(`/api/quiz-sessions/${sessionId}/connections/${connectionId}/items`)

    const served = response.body.items.find((i: { identifier: string }) => i.identifier === 'choice-shuffle-false')
    const sourceFile = quizzes.fileRows.find((f) => f.relativePath === 'sample-shuffle-choice-shuffle-false.xml')
    const sourceXml = sourceFile!.fileData.toString('utf-8')

    const parsedServed = parseQtiXml(served.xml)
    const parsedSource = parseQtiXml(sourceXml)
    expect(parsedServed.document?.item.identifier).toBe(parsedSource.document?.item.identifier)
    expect(new Set(served.xml.match(/identifier="csf_choice_[a-d]"/g))).toEqual(new Set(sourceXml.match(/identifier="csf_choice_[a-d]"/g)))
  })
})

describe('POST /api/quiz-sessions/:sessionId/connections/:connectionId/answers (QUIZ-TAKE-RENDER-001)', () => {
  async function createRunningSessionAndJoin(agent: ReturnType<typeof request.agent>, app: ReturnType<typeof createTestApp>['app'], xml: string, fileName = 'quiz.xml') {
    const { quizId } = await createCourseAndQuizWithItem(agent, xml, fileName)
    const created = await agent.post(`/api/quizzes/${quizId}/sessions`)
    const sessionId = created.body.id as string
    await agent.post(`/api/quiz-sessions/${sessionId}/start`).send({})
    const joined = await request(app).post(`/api/quiz-sessions/${sessionId}/connections`)
    const connectionId = joined.body.id as string
    const itemsResponse = await request(app).get(`/api/quiz-sessions/${sessionId}/connections/${connectionId}/items`)
    return { sessionId, connectionId, itemPath: itemsResponse.body.items[0].path as string }
  }

  it('records a pending, max-score-1 answer for a supported choice item', async () => {
    const { app, users, quizSessionAnswers } = createTestApp()
    const agent = await signInAgent(users, app, 'trainer@example.com')
    const { sessionId, connectionId, itemPath } = await createRunningSessionAndJoin(agent, app, CHOICE_ITEM)

    const response = await request(app)
      .post(`/api/quiz-sessions/${sessionId}/connections/${connectionId}/answers`)
      .send({ itemPath, responses: { RESPONSE: 'choice_b' } })

    expect(response.status).toBe(201)
    const row = quizSessionAnswers.rows.find((row) => row.id === response.body.id)
    expect(row).toMatchObject({ itemIdentifier: 'single-choice-basic', gradingStatus: 'pending', maxScore: 1, score: null })
    expect(row?.responses).toEqual({ RESPONSE: 'choice_b' })
  })

  it('records an ungraded, max-score-0 answer for an unsupported item, ignoring any client-sent responses', async () => {
    const { app, users, quizSessionAnswers } = createTestApp()
    const agent = await signInAgent(users, app, 'trainer@example.com')
    const { sessionId, connectionId, itemPath } = await createRunningSessionAndJoin(agent, app, UNSUPPORTED_ITEM)

    const response = await request(app)
      .post(`/api/quiz-sessions/${sessionId}/connections/${connectionId}/answers`)
      .send({ itemPath, responses: { RESPONSE: 'Rome' } })

    expect(response.status).toBe(201)
    const row = quizSessionAnswers.rows.find((row) => row.id === response.body.id)
    expect(row).toMatchObject({ itemIdentifier: 'text-entry-unsupported', gradingStatus: 'ungraded', maxScore: 0, score: null, responses: null })
  })

  it('returns 404 for a connection that does not belong to the given session', async () => {
    const { app, users } = createTestApp()
    const agent = await signInAgent(users, app, 'trainer@example.com')
    const first = await createRunningSessionAndJoin(agent, app, CHOICE_ITEM)
    const second = await createRunningSessionAndJoin(agent, app, CHOICE_ITEM, 'quiz-2.xml')

    const response = await request(app)
      .post(`/api/quiz-sessions/${second.sessionId}/connections/${first.connectionId}/answers`)
      .send({ itemPath: first.itemPath, responses: {} })

    expect(response.status).toBe(404)
  })

  it('returns 404, not a crash, for a malformed connection id', async () => {
    const { app, users } = createTestApp()
    const agent = await signInAgent(users, app, 'trainer@example.com')
    const { sessionId } = await createRunningSessionAndJoin(agent, app, CHOICE_ITEM)

    const response = await request(app).post(`/api/quiz-sessions/${sessionId}/connections/does-not-exist/answers`).send({ itemPath: 'quiz.xml' })

    expect(response.status).toBe(404)
  })
})

// Covers QUIZ-AUTO-EVAL-001's DoD (active_sprint/story_quiz_auto_eval.md):
// scoring on final submit, and the trainer-facing results endpoint.
describe('POST .../submit scores pending answers (QUIZ-AUTO-EVAL-001)', () => {
  async function createRunningSessionAndAnswer(agent: ReturnType<typeof request.agent>, app: ReturnType<typeof createTestApp>['app'], xml: string, responses: unknown, fileName: string) {
    const { quizId } = await createCourseAndQuizWithItem(agent, xml, fileName)
    const created = await agent.post(`/api/quizzes/${quizId}/sessions`)
    const sessionId = created.body.id as string
    await agent.post(`/api/quiz-sessions/${sessionId}/start`).send({})
    const joined = await request(app).post(`/api/quiz-sessions/${sessionId}/connections`)
    const connectionId = joined.body.id as string
    const itemsResponse = await request(app).get(`/api/quiz-sessions/${sessionId}/connections/${connectionId}/items`)
    const itemPath = itemsResponse.body.items[0].path as string
    await request(app).post(`/api/quiz-sessions/${sessionId}/connections/${connectionId}/answers`).send({ itemPath, responses })
    return { sessionId, connectionId }
  }

  it('scores a correct choice answer as maxScore on submit, in the response result', async () => {
    const { app, users } = createTestApp()
    const agent = await signInAgent(users, app, 'trainer@example.com')
    const { sessionId, connectionId } = await createRunningSessionAndAnswer(agent, app, CHOICE_ITEM, { RESPONSE: 'choice_b' }, 'correct.xml')

    const response = await request(app).post(`/api/quiz-sessions/${sessionId}/connections/${connectionId}/submit`)

    expect(response.status).toBe(200)
    expect(response.body.result).toEqual({
      totalScore: 1,
      maxScore: 1,
      itemResults: [{ itemIdentifier: 'single-choice-basic', gradingStatus: 'graded', score: 1, maxScore: 1 }],
    })
  })

  it('scores an incorrect choice answer as 0 on submit', async () => {
    const { app, users } = createTestApp()
    const agent = await signInAgent(users, app, 'trainer@example.com')
    const { sessionId, connectionId } = await createRunningSessionAndAnswer(agent, app, CHOICE_ITEM, { RESPONSE: 'choice_a' }, 'incorrect.xml')

    const response = await request(app).post(`/api/quiz-sessions/${sessionId}/connections/${connectionId}/submit`)

    expect(response.body.result.totalScore).toBe(0)
    expect(response.body.result.itemResults[0].score).toBe(0)
  })

  it('leaves an ungraded answer untouched, excluded from the denominator', async () => {
    const { app, users } = createTestApp()
    const agent = await signInAgent(users, app, 'trainer@example.com')
    const { sessionId, connectionId } = await createRunningSessionAndAnswer(agent, app, UNSUPPORTED_ITEM, { RESPONSE: 'Rome' }, 'ungraded.xml')

    const response = await request(app).post(`/api/quiz-sessions/${sessionId}/connections/${connectionId}/submit`)

    expect(response.body.result).toEqual({
      totalScore: 0,
      maxScore: 0,
      itemResults: [{ itemIdentifier: 'text-entry-unsupported', gradingStatus: 'ungraded', score: null, maxScore: 0 }],
    })
  })
})

describe('GET /api/quiz-sessions/:sessionId/results (QUIZ-AUTO-EVAL-001)', () => {
  it('returns 409 while not stopped, not the results', async () => {
    const { app, users } = createTestApp()
    const agent = await signInAgent(users, app, 'trainer@example.com')
    const { quizId } = await createCourseAndQuizWithItem(agent, CHOICE_ITEM, 'quiz.xml')
    const created = await agent.post(`/api/quizzes/${quizId}/sessions`)

    const response = await agent.get(`/api/quiz-sessions/${created.body.id}/results`)

    expect(response.status).toBe(409)
    expect(response.body.status).toBe('closed')
  })

  it('returns per-connection scores and a class average once stopped', async () => {
    const { app, users } = createTestApp()
    const agent = await signInAgent(users, app, 'trainer@example.com')
    const { quizId } = await createCourseAndQuizWithItem(agent, CHOICE_ITEM, 'quiz.xml')
    const created = await agent.post(`/api/quizzes/${quizId}/sessions`)
    const sessionId = created.body.id as string
    await agent.post(`/api/quiz-sessions/${sessionId}/start`).send({})

    const studentA = await request(app).post(`/api/quiz-sessions/${sessionId}/connections`)
    const itemsResponse = await request(app).get(`/api/quiz-sessions/${sessionId}/connections/${studentA.body.id}/items`)
    const itemPath = itemsResponse.body.items[0].path as string
    await request(app).post(`/api/quiz-sessions/${sessionId}/connections/${studentA.body.id}/answers`).send({ itemPath, responses: { RESPONSE: 'choice_b' } })
    await request(app).post(`/api/quiz-sessions/${sessionId}/connections/${studentA.body.id}/submit`)

    const studentB = await request(app).post(`/api/quiz-sessions/${sessionId}/connections`)
    await request(app).post(`/api/quiz-sessions/${sessionId}/connections/${studentB.body.id}/answers`).send({ itemPath, responses: { RESPONSE: 'choice_a' } })
    await request(app).post(`/api/quiz-sessions/${sessionId}/connections/${studentB.body.id}/submit`)

    await agent.post(`/api/quiz-sessions/${sessionId}/stop`)

    const response = await agent.get(`/api/quiz-sessions/${sessionId}/results`)

    expect(response.status).toBe(200)
    expect(response.body.connections).toEqual(
      expect.arrayContaining([
        { connectionId: studentA.body.id, totalScore: 1, maxScore: 1, hasUngraded: false },
        { connectionId: studentB.body.id, totalScore: 0, maxScore: 1, hasUngraded: false },
      ]),
    )
    expect(response.body.classAverage).toBe(0.5)
  })

  it('excludes a connection that only ever joined, never submitted (QUIZ-CONNECTION-INTEGRITY-001)', async () => {
    // given: one real submission and one connection that only joined
    const { app, users } = createTestApp()
    const agent = await signInAgent(users, app, 'trainer@example.com')
    const { quizId } = await createCourseAndQuizWithItem(agent, CHOICE_ITEM, 'quiz.xml')
    const created = await agent.post(`/api/quizzes/${quizId}/sessions`)
    const sessionId = created.body.id as string
    await agent.post(`/api/quiz-sessions/${sessionId}/start`).send({})

    const submitted = await request(app).post(`/api/quiz-sessions/${sessionId}/connections`)
    const itemsResponse = await request(app).get(`/api/quiz-sessions/${sessionId}/connections/${submitted.body.id}/items`)
    const itemPath = itemsResponse.body.items[0].path as string
    await request(app).post(`/api/quiz-sessions/${sessionId}/connections/${submitted.body.id}/answers`).send({ itemPath, responses: { RESPONSE: 'choice_b' } })
    await request(app).post(`/api/quiz-sessions/${sessionId}/connections/${submitted.body.id}/submit`)

    const ghost = await request(app).post(`/api/quiz-sessions/${sessionId}/connections`)

    await agent.post(`/api/quiz-sessions/${sessionId}/stop`)

    // when
    const response = await agent.get(`/api/quiz-sessions/${sessionId}/results`)

    // then: only the connection that submitted is present
    expect(response.body.connections).toEqual([{ connectionId: submitted.body.id, totalScore: 1, maxScore: 1, hasUngraded: false }])
    expect(response.body.connections.map((c: { connectionId: string }) => c.connectionId)).not.toContain(ghost.body.id)
  })

  it('includes a genuine zero-answer submission as a real result, not excluded (QUIZ-CONNECTION-INTEGRITY-001)', async () => {
    // given: a student who joined, reached the end, and submitted without answering anything
    const { app, users } = createTestApp()
    const agent = await signInAgent(users, app, 'trainer@example.com')
    const { quizId } = await createCourseAndQuizWithItem(agent, CHOICE_ITEM, 'quiz.xml')
    const created = await agent.post(`/api/quizzes/${quizId}/sessions`)
    const sessionId = created.body.id as string
    await agent.post(`/api/quiz-sessions/${sessionId}/start`).send({})

    const student = await request(app).post(`/api/quiz-sessions/${sessionId}/connections`)
    await request(app).post(`/api/quiz-sessions/${sessionId}/connections/${student.body.id}/submit`)

    await agent.post(`/api/quiz-sessions/${sessionId}/stop`)

    // when
    const response = await agent.get(`/api/quiz-sessions/${sessionId}/results`)

    // then: present with a real (zero) score, not excluded
    expect(response.body.connections).toEqual([{ connectionId: student.body.id, totalScore: 0, maxScore: 0, hasUngraded: false }])
  })

  it('excludes an all-ungraded connection from the class average, not counting it as 0', async () => {
    const { app, users } = createTestApp()
    const agent = await signInAgent(users, app, 'trainer@example.com')
    const { quizId } = await createCourseAndQuizWithItem(agent, UNSUPPORTED_ITEM, 'quiz.xml')
    const created = await agent.post(`/api/quizzes/${quizId}/sessions`)
    const sessionId = created.body.id as string
    await agent.post(`/api/quiz-sessions/${sessionId}/start`).send({})

    const student = await request(app).post(`/api/quiz-sessions/${sessionId}/connections`)
    const itemsResponse = await request(app).get(`/api/quiz-sessions/${sessionId}/connections/${student.body.id}/items`)
    const itemPath = itemsResponse.body.items[0].path as string
    await request(app).post(`/api/quiz-sessions/${sessionId}/connections/${student.body.id}/answers`).send({ itemPath, responses: { RESPONSE: 'Rome' } })
    await request(app).post(`/api/quiz-sessions/${sessionId}/connections/${student.body.id}/submit`)
    await agent.post(`/api/quiz-sessions/${sessionId}/stop`)

    const response = await agent.get(`/api/quiz-sessions/${sessionId}/results`)

    expect(response.body.connections[0]).toEqual({ connectionId: student.body.id, totalScore: 0, maxScore: 0, hasUngraded: true })
    expect(response.body.classAverage).toBeNull()
  })
})

describe('GET /api/quiz-sessions/:sessionId/answer-breakdown (QUIZ-CLASS-REVIEW-001)', () => {
  it('returns 409 while not stopped, not the breakdown', async () => {
    const { app, users } = createTestApp()
    const agent = await signInAgent(users, app, 'trainer@example.com')
    const { quizId } = await createCourseAndQuizWithItem(agent, CHOICE_ITEM, 'quiz.xml')
    const created = await agent.post(`/api/quizzes/${quizId}/sessions`)

    const response = await agent.get(`/api/quiz-sessions/${created.body.id}/answer-breakdown`)

    expect(response.status).toBe(409)
    expect(response.body.status).toBe('closed')
  })

  it('returns per-option counts once stopped, marking the correct option and a no-answer connection', async () => {
    // given: a stopped session with one correct answer, one incorrect
    // answer, and one connection that submitted without answering
    const { app, users } = createTestApp()
    const agent = await signInAgent(users, app, 'trainer@example.com')
    const { quizId } = await createCourseAndQuizWithItem(agent, CHOICE_ITEM, 'quiz.xml')
    const created = await agent.post(`/api/quizzes/${quizId}/sessions`)
    const sessionId = created.body.id as string
    await agent.post(`/api/quiz-sessions/${sessionId}/start`).send({})

    const studentA = await request(app).post(`/api/quiz-sessions/${sessionId}/connections`)
    const itemsResponse = await request(app).get(`/api/quiz-sessions/${sessionId}/connections/${studentA.body.id}/items`)
    const itemPath = itemsResponse.body.items[0].path as string
    await request(app).post(`/api/quiz-sessions/${sessionId}/connections/${studentA.body.id}/answers`).send({ itemPath, responses: { RESPONSE: 'choice_b' } })
    await request(app).post(`/api/quiz-sessions/${sessionId}/connections/${studentA.body.id}/submit`)

    const studentB = await request(app).post(`/api/quiz-sessions/${sessionId}/connections`)
    await request(app).post(`/api/quiz-sessions/${sessionId}/connections/${studentB.body.id}/answers`).send({ itemPath, responses: { RESPONSE: 'choice_a' } })
    await request(app).post(`/api/quiz-sessions/${sessionId}/connections/${studentB.body.id}/submit`)

    const studentC = await request(app).post(`/api/quiz-sessions/${sessionId}/connections`)
    await request(app).post(`/api/quiz-sessions/${sessionId}/connections/${studentC.body.id}/submit`)

    await agent.post(`/api/quiz-sessions/${sessionId}/stop`)

    // when
    const response = await agent.get(`/api/quiz-sessions/${sessionId}/answer-breakdown`)

    // then
    expect(response.status).toBe(200)
    expect(response.body.items).toEqual([
      {
        itemIdentifier: 'single-choice-basic',
        prompt: undefined,
        buckets: [
          { label: 'Berlin', count: 1, isCorrect: false },
          { label: 'Paris', count: 1, isCorrect: true },
        ],
        noAnswerCount: 1,
        respondentCount: 2,
      },
    ])
  })

  it('excludes a connection that only ever joined, never submitted, from the breakdown entirely', async () => {
    const { app, users } = createTestApp()
    const agent = await signInAgent(users, app, 'trainer@example.com')
    const { quizId } = await createCourseAndQuizWithItem(agent, CHOICE_ITEM, 'quiz.xml')
    const created = await agent.post(`/api/quizzes/${quizId}/sessions`)
    const sessionId = created.body.id as string
    await agent.post(`/api/quiz-sessions/${sessionId}/start`).send({})

    await request(app).post(`/api/quiz-sessions/${sessionId}/connections`)
    await agent.post(`/api/quiz-sessions/${sessionId}/stop`)

    const response = await agent.get(`/api/quiz-sessions/${sessionId}/answer-breakdown`)

    expect(response.body.items[0].noAnswerCount).toBe(0)
  })

  it('returns 404, not a crash, for a malformed session id', async () => {
    const { app, users } = createTestApp()
    const agent = await signInAgent(users, app, 'trainer@example.com')

    const response = await agent.get('/api/quiz-sessions/does-not-exist/answer-breakdown')

    expect(response.status).toBe(404)
  })
})

describe('reopening keeps Block #2 counts accumulating (QUIZ-SESSION-LIVE-STATUS-001)', () => {
  it('does not reset joined/submitted counts on reopen', async () => {
    // given: a session with a join and a submit, then stopped
    const { app, users } = createTestApp()
    const agent = await signInAgent(users, app, 'trainer@example.com')
    const { quizId } = await createCourseAndQuiz(agent)
    const created = await agent.post(`/api/quizzes/${quizId}/sessions`)
    await agent.post(`/api/quiz-sessions/${created.body.id}/start`).send({})
    const joined = await request(app).post(`/api/quiz-sessions/${created.body.id}/connections`)
    await request(app).post(`/api/quiz-sessions/${created.body.id}/connections/${joined.body.id}/submit`)
    await agent.post(`/api/quiz-sessions/${created.body.id}/stop`)

    // when: reopening it
    const response = await agent.post(`/api/quiz-sessions/${created.body.id}/start`).send({})

    // then: the counts are unchanged, not reset to zero
    expect(response.body.joinedCount).toBe(1)
    expect(response.body.submittedCount).toBe(1)
  })
})

// QUIZ-RANDOM-QUESTION-ORDER-001/QUIZ-RANDOM-ANSWER-ORDER-001's DoD: "no
// code change needed [for attribution], but a test proves it rather than
// assumes it" (ADR-0013). Two connections in the SAME force-shuffled
// session each get their own independently generated item/choice order
// (QUIZ-SESSION-PER-STUDENT-DELIVERY-001) — this proves scoring, the
// answer breakdown, and per-connection results all still attribute each
// response to its real item/choice identifier, never to a served
// position, regardless of what each connection's own order happened to
// be.
describe('scoring/breakdown attribution survives differing per-connection delivery order (QUIZ-RANDOM-QUESTION-ORDER-001/QUIZ-RANDOM-ANSWER-ORDER-001)', () => {
  async function createRunningShuffledSession(agent: ReturnType<typeof request.agent>) {
    const courseResponse = await agent.post('/api/courses').send({ title: 'Attribution course' })
    const courseId = courseResponse.body.id as string
    const quizResponse = await agent.post(`/api/courses/${courseId}/quizzes`).attach('file', zipOf(shuffledPackageEntries()), 'shuffle-quiz.zip')
    const quizId = quizResponse.body.id as string
    const created = await agent.post(`/api/quizzes/${quizId}/sessions`)
    const sessionId = created.body.id as string
    // given: force-shuffle on for BOTH questions and answers — the
    // maximally-adversarial case for attribution, since both this
    // connection's item order and its choice-shuffle-true item's choice
    // order are independently randomized per connection.
    await agent.post(`/api/quiz-sessions/${sessionId}/start`).send({ forceShuffleQuestions: true, forceShuffleAnswers: true })
    return sessionId
  }

  it('scores each connection correctly by choice identifier, not by the position it was served in', async () => {
    const { app, users } = createTestApp()
    const agent = await signInAgent(users, app, 'trainer@example.com')
    const sessionId = await createRunningShuffledSession(agent)

    // given: two connections, each generating (likely) its own distinct
    // delivery order for the same session
    const connA = (await request(app).post(`/api/quiz-sessions/${sessionId}/connections`)).body.id as string
    const connB = (await request(app).post(`/api/quiz-sessions/${sessionId}/connections`)).body.id as string
    const itemsA = (await request(app).get(`/api/quiz-sessions/${sessionId}/connections/${connA}/items`)).body.items
    const itemsB = (await request(app).get(`/api/quiz-sessions/${sessionId}/connections/${connB}/items`)).body.items
    const targetA = itemsA.find((i: { identifier: string }) => i.identifier === 'choice-shuffle-true')
    const targetB = itemsB.find((i: { identifier: string }) => i.identifier === 'choice-shuffle-true')

    // when: A answers correctly (cst_choice_b), B answers incorrectly
    // (cst_choice_a) — by identifier, exactly as a real player's
    // serialize() would send, regardless of each one's own served choice
    // order
    await request(app).post(`/api/quiz-sessions/${sessionId}/connections/${connA}/answers`).send({ itemPath: targetA.path, responses: { RESPONSE: 'cst_choice_b' } })
    await request(app).post(`/api/quiz-sessions/${sessionId}/connections/${connB}/answers`).send({ itemPath: targetB.path, responses: { RESPONSE: 'cst_choice_a' } })
    const submittedA = await request(app).post(`/api/quiz-sessions/${sessionId}/connections/${connA}/submit`)
    const submittedB = await request(app).post(`/api/quiz-sessions/${sessionId}/connections/${connB}/submit`)

    // then: each connection's own result attributes its choice-shuffle-true
    // item correctly, independent of its own served order
    const resultA = submittedA.body.result.itemResults.find((r: { itemIdentifier: string }) => r.itemIdentifier === 'choice-shuffle-true')
    const resultB = submittedB.body.result.itemResults.find((r: { itemIdentifier: string }) => r.itemIdentifier === 'choice-shuffle-true')
    expect(resultA).toMatchObject({ gradingStatus: 'graded', score: 1, maxScore: 1 })
    expect(resultB).toMatchObject({ gradingStatus: 'graded', score: 0, maxScore: 1 })

    await agent.post(`/api/quiz-sessions/${sessionId}/stop`)

    // and: the trainer-facing per-connection results also attribute the
    // right total to the right connection
    const results = await agent.get(`/api/quiz-sessions/${sessionId}/results`)
    const perConnection = Object.fromEntries(results.body.connections.map((c: { connectionId: string; totalScore: number }) => [c.connectionId, c.totalScore]))
    expect(perConnection[connA]).toBeGreaterThan(perConnection[connB])

    // and: the answer breakdown buckets each response under the real
    // choice label ("Option B"/"Option A"), correctly marking the
    // authored-correct one, never under a served-position label
    const breakdown = await agent.get(`/api/quiz-sessions/${sessionId}/answer-breakdown`)
    const itemBreakdown = breakdown.body.items.find((i: { itemIdentifier: string }) => i.itemIdentifier === 'choice-shuffle-true')
    const bucketFor = (label: string) => itemBreakdown.buckets.find((b: { label: string }) => b.label === label)
    expect(bucketFor('Option B')).toMatchObject({ count: 1, isCorrect: true })
    expect(bucketFor('Option A')).toMatchObject({ count: 1, isCorrect: false })
  })
})
