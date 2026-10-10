import 'dotenv/config'
import { inArray, like, sql } from 'drizzle-orm'
import { createDb } from '../src/db/client.js'
import {
  users,
  tenants,
  courses,
  quizzes,
  quizFiles,
  quizSessions,
  quizSessionConnections,
  quizSessionAnswers,
  confirmationTokens,
  sessions,
} from '../src/db/schema.js'
import { validPackageZip } from '../test-fixtures/qti-samples/buildPackage.js'

/**
 * TESTDATA-001: standalone CLI script that puts the app into a small,
 * known-good state a human tester can immediately explore — two trainer
 * accounts, a course, a quiz built from the same multi-item QTI package
 * fixture the automated tests use (one single-choice item, one
 * multi-select item), a quiz session, and three student attempts (fully
 * correct, incorrect, and partially-correct multi-select).
 *
 * Deliberately drives the *running server's real HTTP API* for every row
 * whose correctness depends on app logic (signup/login, course/quiz
 * creation, session start, student join/answer/submit) rather than
 * inserting rows directly — this is the only way a seeded attempt's
 * `gradingStatus`/`score` is guaranteed to match what the app itself would
 * produce, today or after any future scoring change. The one exception is
 * the *cleanup* pass below: deleting old seed rows scoped to
 * `@seed.local` before recreating them is plain teardown, not something
 * the HTTP API exposes a way to do (there is no "delete a course" or
 * "delete a user" endpoint), so it goes straight to the database, and
 * only ever touches rows already scoped to that fixed domain.
 *
 * Run with: npm run db:seed (from server/). Requires the server to
 * already be running (APP_BASE_URL, default http://localhost:3000) with
 * EXPEDITE_SIGNUP_ENABLED=true (see server/.env.example) — that flag is
 * what lets this script create confirmed accounts without reading a
 * confirmation email out of Mailpit.
 */

const SEED_EMAIL_DOMAIN = '@seed.local'
const SEED_PASSWORD = 'SeedPass123!'
const TRAINER_1_EMAIL = `trainer1${SEED_EMAIL_DOMAIN}`
const TRAINER_2_EMAIL = `trainer2${SEED_EMAIL_DOMAIN}`
const COURSE_TITLE = 'Seed Course'
const QUIZ_FILE_NAME = 'seed-geography-quiz.zip'

const SINGLE_CHOICE_PATH = 'sample-accept-single-choice-basic.xml'
const MULTIPLE_CHOICE_PATH = 'sample-accept-multiple-choice-basic.xml'

interface HttpResult {
  status: number
  body: any
}

/**
 * Minimal single-user cookie jar around `fetch` — the server's session is
 * a `connect.sid` cookie (`express-session`), and there is no reason to
 * pull in a full HTTP client library just to resend it on every request.
 * One instance per simulated actor (trainer1, trainer2, each student
 * connection) so their sessions never leak into each other.
 */
class HttpAgent {
  private cookie: string | undefined

  constructor(private readonly baseUrl: string) {}

  async request(method: string, path: string, options: { json?: unknown; form?: FormData } = {}): Promise<HttpResult> {
    const headers: Record<string, string> = {}
    if (this.cookie) headers['cookie'] = this.cookie

    let body: BodyInit | undefined
    if (options.json !== undefined) {
      headers['content-type'] = 'application/json'
      body = JSON.stringify(options.json)
    } else if (options.form) {
      body = options.form
    }

    const res = await fetch(`${this.baseUrl}${path}`, { method, headers, body })

    const setCookie = typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : []
    if (setCookie.length > 0) {
      this.cookie = setCookie.map((c) => c.split(';')[0]).join('; ')
    }

    const text = await res.text()
    let parsedBody: unknown = undefined
    if (text.length > 0) {
      try {
        parsedBody = JSON.parse(text)
      } catch {
        parsedBody = text
      }
    }
    return { status: res.status, body: parsedBody }
  }

  get(path: string) {
    return this.request('GET', path)
  }
  post(path: string, options: { json?: unknown; form?: FormData } = {}) {
    return this.request('POST', path, options)
  }
}

function expect(result: HttpResult, expectedStatus: number, step: string): HttpResult {
  if (result.status !== expectedStatus) {
    throw new Error(`${step} failed: expected HTTP ${expectedStatus}, got ${result.status} — ${JSON.stringify(result.body)}`)
  }
  return result
}

/**
 * Deletes every row this script could have created on a previous run,
 * scoped strictly to `@seed.local` accounts and whatever hangs off them
 * (tenant, courses, quizzes, sessions, connections, answers) — nothing
 * outside that domain is ever touched. Bottom-up, respecting the
 * (unenforced-by-cascade) foreign keys in `db/schema.ts`.
 *
 * Two things beyond a plain "find seed users, cascade from there":
 *
 * - Tenants are also looked up by *name* (`tenants.ensureCurrentTenant`
 *   derives it from the owning email, e.g. `trainer1@seed.local's
 *   workspace`), not only by following `users.currentTenantId` — a run
 *   interrupted after deleting a seed user but before its tenant would
 *   otherwise leave that tenant orphaned forever, and on the next run
 *   `ensureCurrentTenant`'s unique-name insert would collide with it and
 *   raise instead of recovering (its own recovery path only handles a
 *   racing *insert*, not a pre-existing orphan). Matching by name closes
 *   that gap without needing this script to never crash.
 * - Every step runs in one transaction, so a failure partway through
 *   leaves either the fully-old or the fully-cleaned state, never a
 *   half-deleted one that the next run's queries above would misread.
 */
async function cleanupSeedData(db: ReturnType<typeof createDb>['db']) {
  await db.transaction(async (tx) => {
    const seedUsers = await tx
      .select({ id: users.id, currentTenantId: users.currentTenantId })
      .from(users)
      .where(like(users.email, `%${SEED_EMAIL_DOMAIN}`))

    const seedTenantsByName = await tx
      .select({ id: tenants.id })
      .from(tenants)
      .where(like(tenants.name, `%${SEED_EMAIL_DOMAIN}%`))

    const userIds = seedUsers.map((u) => u.id)
    const tenantIds = [
      ...new Set([...seedUsers.map((u) => u.currentTenantId).filter((id): id is string => id !== null), ...seedTenantsByName.map((t) => t.id)]),
    ]

    let courseIds: string[] = []
    if (tenantIds.length > 0) {
      const seedCourses = await tx.select({ id: courses.id }).from(courses).where(inArray(courses.tenantId, tenantIds))
      courseIds = seedCourses.map((c) => c.id)
    }

    let quizIds: string[] = []
    if (courseIds.length > 0) {
      const seedQuizzes = await tx.select({ id: quizzes.id }).from(quizzes).where(inArray(quizzes.courseId, courseIds))
      quizIds = seedQuizzes.map((q) => q.id)
    }

    let sessionIds: string[] = []
    if (quizIds.length > 0) {
      const seedSessions = await tx.select({ id: quizSessions.id }).from(quizSessions).where(inArray(quizSessions.quizId, quizIds))
      sessionIds = seedSessions.map((s) => s.id)
    }

    let connectionIds: string[] = []
    if (sessionIds.length > 0) {
      const seedConnections = await tx
        .select({ id: quizSessionConnections.id })
        .from(quizSessionConnections)
        .where(inArray(quizSessionConnections.sessionId, sessionIds))
      connectionIds = seedConnections.map((c) => c.id)
    }

    if (connectionIds.length > 0) {
      await tx.delete(quizSessionAnswers).where(inArray(quizSessionAnswers.connectionId, connectionIds))
    }
    if (sessionIds.length > 0) {
      await tx.delete(quizSessionConnections).where(inArray(quizSessionConnections.sessionId, sessionIds))
      await tx.delete(quizSessions).where(inArray(quizSessions.quizId, quizIds))
    }
    if (quizIds.length > 0) {
      await tx.delete(quizFiles).where(inArray(quizFiles.quizId, quizIds))
      await tx.delete(quizzes).where(inArray(quizzes.courseId, courseIds))
    }
    if (courseIds.length > 0) {
      await tx.delete(courses).where(inArray(courses.tenantId, tenantIds))
    }
    if (userIds.length > 0) {
      await tx.delete(confirmationTokens).where(inArray(confirmationTokens.userId, userIds))
    }
    await tx.delete(users).where(like(users.email, `%${SEED_EMAIL_DOMAIN}`))
    if (tenantIds.length > 0) {
      await tx.delete(tenants).where(inArray(tenants.id, tenantIds))
    }

    // A browser already signed in as a seed account (express-session, via
    // connect-pg-simple) still points at the tenant/user just deleted
    // above — left alone, that tester would see a stale/empty state until
    // manually logging out. `sess` is a `json` column holding
    // `{ userEmail, ... }` (login.ts) — matched as text, since `@seed.local`
    // never needs indexed/structural json querying here.
    await tx.delete(sessions).where(sql`${sessions.sess}::text ILIKE ${`%${SEED_EMAIL_DOMAIN}%`}`)

    console.log(
      `cleaned up previous seed data: ${userIds.length} user(s), ${tenantIds.length} tenant(s), ${courseIds.length} course(s), ${quizIds.length} quiz(zes), ${sessionIds.length} session(s)`,
    )
  })
}

async function signupExpedite(baseUrl: string, email: string, password: string) {
  const agent = new HttpAgent(baseUrl)
  const result = await agent.post('/api/signup/expedite', { json: { email, password } })
  if (result.status === 201) return
  if (result.status === 409) {
    // Already exists — cleanupSeedData should have removed it, but
    // tolerate a concurrent/partial previous run rather than fail.
    console.warn(`signup/expedite: ${email} already existed`)
    return
  }
  throw new Error(`signup/expedite for ${email} failed: HTTP ${result.status} — ${JSON.stringify(result.body)}`)
}

async function login(baseUrl: string, email: string, password: string): Promise<HttpAgent> {
  const agent = new HttpAgent(baseUrl)
  expect(await agent.post('/api/login', { json: { email, password } }), 200, `login as ${email}`)
  return agent
}

interface StudentAnswer {
  singleChoice: string
  multipleChoice: string[]
}

async function takeQuizAsStudent(baseUrl: string, sessionId: string, answer: StudentAnswer, label: string) {
  const agent = new HttpAgent(baseUrl)
  const joined = expect(await agent.post(`/api/quiz-sessions/${sessionId}/connections`), 201, `${label}: join session`)
  const connectionId = joined.body.id as string

  const itemsResult = await agent.get(`/api/quiz-sessions/${sessionId}/connections/${connectionId}/items`)
  const items: { identifier: string; path: string }[] = itemsResult.body.items

  const singleChoiceItem = items.find((item) => item.path === SINGLE_CHOICE_PATH)
  const multipleChoiceItem = items.find((item) => item.path === MULTIPLE_CHOICE_PATH)
  if (!singleChoiceItem || !multipleChoiceItem) {
    throw new Error(`${label}: expected quiz session items to include ${SINGLE_CHOICE_PATH} and ${MULTIPLE_CHOICE_PATH}, got ${JSON.stringify(items)}`)
  }

  expect(
    await agent.post(`/api/quiz-sessions/${sessionId}/connections/${connectionId}/answers`, {
      json: { itemPath: singleChoiceItem.path, responses: { RESPONSE: answer.singleChoice } },
    }),
    201,
    `${label}: answer single-choice item`,
  )
  expect(
    await agent.post(`/api/quiz-sessions/${sessionId}/connections/${connectionId}/answers`, {
      json: { itemPath: multipleChoiceItem.path, responses: { RESPONSE: answer.multipleChoice } },
    }),
    201,
    `${label}: answer multiple-choice item`,
  )

  const submitted = expect(await agent.post(`/api/quiz-sessions/${sessionId}/connections/${connectionId}/submit`), 200, `${label}: submit`)
  console.log(`${label}: score ${submitted.body.result.totalScore}/${submitted.body.result.maxScore}`)
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not set — copy server/.env.example to server/.env first')
  }
  const baseUrl = process.env.APP_BASE_URL ?? 'http://localhost:3000'

  const healthCheck = await fetch(`${baseUrl}/api/config`).catch(() => undefined)
  if (!healthCheck || !healthCheck.ok) {
    throw new Error(`could not reach the server at ${baseUrl} — start it first (see server/README.md)`)
  }
  const config = await healthCheck.json()
  if (config.expediteSignupEnabled !== true) {
    throw new Error(
      `EXPEDITE_SIGNUP_ENABLED is not "true" on the running server (${baseUrl}) — this script needs it to create confirmed seed accounts without reading a confirmation email. Set EXPEDITE_SIGNUP_ENABLED=true in server/.env and restart the server.`,
    )
  }

  const { db, pool } = createDb(databaseUrl)

  try {
    await cleanupSeedData(db)

    await signupExpedite(baseUrl, TRAINER_1_EMAIL, SEED_PASSWORD)
    await signupExpedite(baseUrl, TRAINER_2_EMAIL, SEED_PASSWORD)

    // Logging in trainer2 too (even though nothing further is seeded under
    // it) both exercises that account end-to-end and ensures it has a
    // tenant of its own, same as trainer1 — so a tester can sign in as
    // either seeded account and land somewhere real.
    await login(baseUrl, TRAINER_2_EMAIL, SEED_PASSWORD)

    const trainer1 = await login(baseUrl, TRAINER_1_EMAIL, SEED_PASSWORD)

    const courseResult = expect(await trainer1.post('/api/courses', { json: { title: COURSE_TITLE } }), 201, 'create course')
    const courseId = courseResult.body.id as string

    const form = new FormData()
    form.append('file', new Blob([validPackageZip()], { type: 'application/zip' }), QUIZ_FILE_NAME)
    const quizResult = expect(await trainer1.post(`/api/courses/${courseId}/quizzes`, { form }), 201, 'upload quiz')
    const quizId = quizResult.body.id as string

    const sessionResult = expect(await trainer1.post(`/api/quizzes/${quizId}/sessions`), 201, 'create quiz session')
    const sessionId = sessionResult.body.id as string

    expect(await trainer1.post(`/api/quiz-sessions/${sessionId}/start`, { json: {} }), 200, 'start quiz session')

    // Three attempts: fully correct, incorrect, and partially-correct on
    // the multi-select item (chose only one of its two correct options) —
    // exactly the DoD's three cases, and real data for the two
    // Answer-Breakdown bug fixes in progress this sprint.
    await takeQuizAsStudent(baseUrl, sessionId, { singleChoice: 'choice_b', multipleChoice: ['choice_a', 'choice_c'] }, 'student A (fully correct)')
    await takeQuizAsStudent(baseUrl, sessionId, { singleChoice: 'choice_a', multipleChoice: ['choice_b', 'choice_d'] }, 'student B (incorrect)')
    await takeQuizAsStudent(baseUrl, sessionId, { singleChoice: 'choice_b', multipleChoice: ['choice_a'] }, 'student C (partially-correct multi-select)')

    expect(await trainer1.post(`/api/quiz-sessions/${sessionId}/stop`), 200, 'stop quiz session')

    console.log('')
    console.log('Seed data ready:')
    console.log(`  trainer accounts: ${TRAINER_1_EMAIL} / ${TRAINER_2_EMAIL} (password: ${SEED_PASSWORD})`)
    console.log(`  course: "${COURSE_TITLE}" (${courseId})`)
    console.log(`  quiz: "${quizResult.body.title}" (${quizId})`)
    console.log(`  quiz session (stopped): ${sessionId}`)
    console.log(`  sign in at ${baseUrl} as ${TRAINER_1_EMAIL} to see it`)
  } finally {
    await pool.end()
  }
}

main().catch((err) => {
  console.error('db seed failed:', err)
  process.exitCode = 1
})
