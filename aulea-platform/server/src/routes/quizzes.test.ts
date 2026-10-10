import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import request from 'supertest'
import AdmZip from 'adm-zip'
import { createApp } from '../app.js'
import { validPackageZip } from '../../test-fixtures/qti-samples/buildPackage.js'
import {
  createFakeUserRepository,
  createFakeTenantRepository,
  createFakeCourseRepository,
  createFakeQuizRepository,
  createTestSessionMiddleware,
  signInAgent,
} from '../testSupport/fakes.js'

// Covers QUIZ-DASHBOARD-001's DoD (active_sprint/story_quiz_dashboard.md):
// list, delete, and replace-file, all scoped to a course the caller's
// tenant actually owns. Also covers QTI3-MIGRATION-001's DoD
// (active_sprint/story_qti3_migration.md, replacing QTI-22-IMPORT's
// original QTI 2.2 coverage per ADR-0007's hard cutover): POST validates
// the file as QTI 3.0 before creating a row, rejecting an invalid one
// with line/element-level errors and not creating anything.
//
// Also covers QUIZ-PACKAGE-STORAGE-001's DoD
// (active_sprint/story_qti_package_storage.md): POST/PUT accept a `.zip`
// package through the same input, stored as one `quiz_files` row per file.

const VALID_QTI_ITEM = `<qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" identifier="q1" title="Sample question">
  <qti-item-body><p>What is 2 + 2?</p></qti-item-body>
</qti-assessment-item>`

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SAMPLES_DIR = path.resolve(__dirname, '../../test-fixtures/qti-samples')

function readSample(name: string): Buffer {
  return readFileSync(path.join(SAMPLES_DIR, name))
}

function createTestApp() {
  const users = createFakeUserRepository()
  const tenants = createFakeTenantRepository()
  const courses = createFakeCourseRepository()
  const quizzes = createFakeQuizRepository()
  const app = createApp({ users, tenants, courses, quizzes, sessionMiddleware: createTestSessionMiddleware() })
  return { app, users, courses, quizzes }
}

async function createCourse(agent: ReturnType<typeof request.agent>, title = 'Intro to Python') {
  const response = await agent.post('/api/courses').send({ title })
  return response.body.id as string
}

describe('GET /api/courses/:courseId/quizzes (QUIZ-DASHBOARD-001)', () => {
  it('returns 401 when not signed in', async () => {
    const { app } = createTestApp()
    const response = await request(app).get('/api/courses/some-id/quizzes')
    expect(response.status).toBe(401)
  })

  it('returns 404 for a course belonging to a different tenant', async () => {
    // given: a course created by tenant A
    const { app, users } = createTestApp()
    const agentA = await signInAgent(users, app, 'trainer-a@example.com')
    const courseId = await createCourse(agentA)
    const agentB = await signInAgent(users, app, 'trainer-b@example.com')

    // when: tenant B tries to list its quizzes
    const response = await agentB.get(`/api/courses/${courseId}/quizzes`)

    // then: it's a 404, not a 403 — doesn't confirm the course exists at all
    expect(response.status).toBe(404)
  })

  it('lists the quizzes belonging to the course', async () => {
    // given: a course with two seeded quiz rows
    const { app, users, courses, quizzes } = createTestApp()
    const agent = await signInAgent(users, app, 'trainer@example.com')
    const courseId = await createCourse(agent)
    void courses
    await quizzes.create({ courseId, title: 'Quiz 1', fileName: 'quiz1.xml', files: [{ relativePath: 'quiz1.xml', fileData: Buffer.from('x') }] })
    await quizzes.create({ courseId, title: 'Quiz 2', fileName: 'quiz2.xml', files: [{ relativePath: 'quiz2.xml', fileData: Buffer.from('y') }] })

    // when: listing quizzes for the course
    const response = await agent.get(`/api/courses/${courseId}/quizzes`)

    // then: both are returned, with title, upload date (createdAt), and status
    expect(response.status).toBe(200)
    expect(response.body).toHaveLength(2)
    expect(response.body[0]).toMatchObject({ title: 'Quiz 1', status: 'uploaded' })
    expect(response.body[0].createdAt).toBeDefined()
  })

  it('returns an empty list for a course with no quizzes yet', async () => {
    const { app, users } = createTestApp()
    const agent = await signInAgent(users, app, 'trainer@example.com')
    const courseId = await createCourse(agent)

    const response = await agent.get(`/api/courses/${courseId}/quizzes`)

    expect(response.status).toBe(200)
    expect(response.body).toEqual([])
  })
})

describe('POST /api/courses/:courseId/quizzes (QTI-22-IMPORT)', () => {
  it('returns 401 when not signed in', async () => {
    const { app } = createTestApp()
    const response = await request(app).post('/api/courses/some-id/quizzes').attach('file', Buffer.from(VALID_QTI_ITEM), 'quiz.xml')
    expect(response.status).toBe(401)
  })

  it('returns 404 for a course belonging to a different tenant', async () => {
    const { app, users } = createTestApp()
    const agentA = await signInAgent(users, app, 'trainer-a@example.com')
    const courseId = await createCourse(agentA)
    const agentB = await signInAgent(users, app, 'trainer-b@example.com')

    const response = await agentB.post(`/api/courses/${courseId}/quizzes`).attach('file', Buffer.from(VALID_QTI_ITEM), 'quiz.xml')

    expect(response.status).toBe(404)
  })

  it('returns 400 when no file is attached', async () => {
    const { app, users } = createTestApp()
    const agent = await signInAgent(users, app, 'trainer@example.com')
    const courseId = await createCourse(agent)

    const response = await agent.post(`/api/courses/${courseId}/quizzes`)

    expect(response.status).toBe(400)
    expect(response.body).toEqual({ error: 'missing_file' })
  })

  it('creates a quiz from a valid QTI 3.0 file, using its declared title', async () => {
    // given: a signed-in trainer with a course
    const { app, users } = createTestApp()
    const agent = await signInAgent(users, app, 'trainer@example.com')
    const courseId = await createCourse(agent)

    // when: uploading a well-formed QTI 3.0 item
    const response = await agent.post(`/api/courses/${courseId}/quizzes`).attach('file', Buffer.from(VALID_QTI_ITEM), 'question1.xml')

    // then: it is created, titled from the file's own "title" attribute
    expect(response.status).toBe(201)
    expect(response.body.title).toBe('Sample question')
    expect(response.body.status).toBe('uploaded')
    const listResponse = await agent.get(`/api/courses/${courseId}/quizzes`)
    expect(listResponse.body).toHaveLength(1)
  })

  it('rejects an invalid QTI file with line/element-level errors, creating nothing', async () => {
    // given: a file missing the required "identifier" attribute
    const { app, users } = createTestApp()
    const agent = await signInAgent(users, app, 'trainer@example.com')
    const courseId = await createCourse(agent)
    const invalid = '<qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" title="No id"><qti-item-body/></qti-assessment-item>'

    // when: uploading it
    const response = await agent.post(`/api/courses/${courseId}/quizzes`).attach('file', Buffer.from(invalid), 'bad.xml')

    // then: it is rejected with structured errors, and no quiz was created
    expect(response.status).toBe(400)
    expect(response.body.error).toBe('invalid_format')
    expect(response.body.errors.length).toBeGreaterThan(0)
    expect(response.body.errors[0]).toHaveProperty('line')
    expect(response.body.errors[0]).toHaveProperty('message')
    const listResponse = await agent.get(`/api/courses/${courseId}/quizzes`)
    expect(listResponse.body).toEqual([])
  })

  it('rejects malformed (non-well-formed) XML the same way', async () => {
    const { app, users } = createTestApp()
    const agent = await signInAgent(users, app, 'trainer@example.com')
    const courseId = await createCourse(agent)

    const response = await agent.post(`/api/courses/${courseId}/quizzes`).attach('file', Buffer.from('<not><valid<xml'), 'broken.xml')

    expect(response.status).toBe(400)
    expect(response.body.error).toBe('invalid_format')
  })
})

describe('POST /api/courses/:courseId/quizzes — .zip package (QUIZ-PACKAGE-STORAGE-001)', () => {
  it('creates a quiz from a valid multi-item .zip package, storing every file', async () => {
    // given: a signed-in trainer with a course
    const { app, users, quizzes } = createTestApp()
    const agent = await signInAgent(users, app, 'trainer@example.com')
    const courseId = await createCourse(agent)

    // when: uploading a well-formed QTI 3.0 package
    const response = await agent.post(`/api/courses/${courseId}/quizzes`).attach('file', validPackageZip(), 'geography-quiz.zip')

    // then: the quiz is created, titled from test.xml's own title, with all 4 files stored
    expect(response.status).toBe(201)
    expect(response.body.title).toBe('Geography quiz (multi-item test)')
    expect(response.body.fileName).toBe('geography-quiz.zip')
    const storedFiles = quizzes.fileRows.filter((f) => f.quizId === response.body.id)
    expect(storedFiles.map((f) => f.relativePath).sort()).toEqual(
      ['imsmanifest.xml', 'sample-accept-multiple-choice-basic.xml', 'sample-accept-single-choice-basic.xml', 'test.xml'].sort(),
    )
  })

  it('still accepts a standalone single-item upload, stored as a 1-row package with no manifest', async () => {
    // given/when: uploading a bare QTI 3.0 item, same as before this story
    const { app, users, quizzes } = createTestApp()
    const agent = await signInAgent(users, app, 'trainer@example.com')
    const courseId = await createCourse(agent)
    const response = await agent.post(`/api/courses/${courseId}/quizzes`).attach('file', Buffer.from(VALID_QTI_ITEM), 'question1.xml')

    // then: unchanged trainer-facing behavior, but internally a 1-file package
    expect(response.status).toBe(201)
    const storedFiles = quizzes.fileRows.filter((f) => f.quizId === response.body.id)
    expect(storedFiles).toHaveLength(1)
    expect(storedFiles[0].relativePath).toBe('question1.xml')
  })

  it('rejects a .zip that is not a valid archive, creating nothing', async () => {
    const { app, users } = createTestApp()
    const agent = await signInAgent(users, app, 'trainer@example.com')
    const courseId = await createCourse(agent)

    const response = await agent.post(`/api/courses/${courseId}/quizzes`).attach('file', Buffer.from('not a zip'), 'broken.zip')

    expect(response.status).toBe(400)
    expect(response.body.error).toBe('invalid_format')
    const listResponse = await agent.get(`/api/courses/${courseId}/quizzes`)
    expect(listResponse.body).toEqual([])
  })

  it('rejects a package with a dangling item-ref href, creating nothing', async () => {
    // given: a package missing one of the two files test.xml references
    const { app, users } = createTestApp()
    const agent = await signInAgent(users, app, 'trainer@example.com')
    const courseId = await createCourse(agent)
    const zip = new AdmZip()
    zip.addFile('imsmanifest.xml', Buffer.from('<manifest/>', 'utf-8'))
    zip.addFile('test.xml', readSample('sample-accept-multi-item-test.xml'))
    zip.addFile('sample-accept-single-choice-basic.xml', readSample('sample-accept-single-choice-basic.xml'))
    // sample-accept-multiple-choice-basic.xml intentionally omitted

    // when: uploading it
    const response = await agent.post(`/api/courses/${courseId}/quizzes`).attach('file', zip.toBuffer(), 'incomplete.zip')

    // then: rejected with structured errors naming the dangling file, nothing created
    expect(response.status).toBe(400)
    expect(response.body.error).toBe('invalid_format')
    expect(response.body.errors.some((e: { message: string }) => e.message.includes('sample-accept-multiple-choice-basic.xml'))).toBe(true)
    const listResponse = await agent.get(`/api/courses/${courseId}/quizzes`)
    expect(listResponse.body).toEqual([])
  })

  it('rejects a package missing test.xml, creating nothing', async () => {
    const { app, users } = createTestApp()
    const agent = await signInAgent(users, app, 'trainer@example.com')
    const courseId = await createCourse(agent)
    const zip = new AdmZip()
    zip.addFile('imsmanifest.xml', Buffer.from('<manifest/>', 'utf-8'))

    const response = await agent.post(`/api/courses/${courseId}/quizzes`).attach('file', zip.toBuffer(), 'no-test.zip')

    expect(response.status).toBe(400)
    expect(response.body.error).toBe('invalid_format')
    const listResponse = await agent.get(`/api/courses/${courseId}/quizzes`)
    expect(listResponse.body).toEqual([])
  })
})

describe('DELETE /api/courses/:courseId/quizzes/:quizId (QUIZ-DASHBOARD-001)', () => {
  it('deletes the quiz row', async () => {
    // given: a course with one quiz
    const { app, users, quizzes } = createTestApp()
    const agent = await signInAgent(users, app, 'trainer@example.com')
    const courseId = await createCourse(agent)
    const quiz = await quizzes.create({ courseId, title: 'Quiz 1', fileName: 'quiz1.xml', files: [{ relativePath: 'quiz1.xml', fileData: Buffer.from('x') }] })

    // when: deleting it
    const response = await agent.delete(`/api/courses/${courseId}/quizzes/${quiz.id}`)

    // then: it succeeds and the row is gone
    expect(response.status).toBe(204)
    const listResponse = await agent.get(`/api/courses/${courseId}/quizzes`)
    expect(listResponse.body).toEqual([])
  })

  it('returns 404 for a quiz that does not belong to the course', async () => {
    const { app, users } = createTestApp()
    const agent = await signInAgent(users, app, 'trainer@example.com')
    const courseId = await createCourse(agent)

    const response = await agent.delete(`/api/courses/${courseId}/quizzes/not-a-real-id`)

    expect(response.status).toBe(404)
  })

  it("returns 404 when the course belongs to a different tenant, without deleting anything", async () => {
    // given: a quiz that belongs to tenant A's course
    const { app, users, quizzes } = createTestApp()
    const agentA = await signInAgent(users, app, 'trainer-a@example.com')
    const courseId = await createCourse(agentA)
    const quiz = await quizzes.create({ courseId, title: 'Quiz 1', fileName: 'quiz1.xml', files: [{ relativePath: 'quiz1.xml', fileData: Buffer.from('x') }] })
    const agentB = await signInAgent(users, app, 'trainer-b@example.com')

    // when: tenant B tries to delete it
    const response = await agentB.delete(`/api/courses/${courseId}/quizzes/${quiz.id}`)

    // then: rejected, and the quiz still exists for tenant A
    expect(response.status).toBe(404)
    const listResponse = await agentA.get(`/api/courses/${courseId}/quizzes`)
    expect(listResponse.body).toHaveLength(1)
  })
})

describe('PUT /api/courses/:courseId/quizzes/:quizId/file (QUIZ-DASHBOARD-001)', () => {
  it('replaces the file without creating a new row', async () => {
    // given: a course with one quiz
    const { app, users, quizzes } = createTestApp()
    const agent = await signInAgent(users, app, 'trainer@example.com')
    const courseId = await createCourse(agent)
    const quiz = await quizzes.create({ courseId, title: 'Quiz 1', fileName: 'original.xml', files: [{ relativePath: 'original.xml', fileData: Buffer.from('x') }] })

    // when: replacing its file
    const response = await agent
      .put(`/api/courses/${courseId}/quizzes/${quiz.id}/file`)
      .attach('file', Buffer.from('<xml>new</xml>'), 'replacement.xml')

    // then: the same row is updated, not a new one added
    expect(response.status).toBe(200)
    expect(response.body.id).toBe(quiz.id)
    expect(response.body.fileName).toBe('replacement.xml')
    const listResponse = await agent.get(`/api/courses/${courseId}/quizzes`)
    expect(listResponse.body).toHaveLength(1)
  })

  it('returns 400 when no file is attached', async () => {
    const { app, users, quizzes } = createTestApp()
    const agent = await signInAgent(users, app, 'trainer@example.com')
    const courseId = await createCourse(agent)
    const quiz = await quizzes.create({ courseId, title: 'Quiz 1', fileName: 'original.xml', files: [{ relativePath: 'original.xml', fileData: Buffer.from('x') }] })

    const response = await agent.put(`/api/courses/${courseId}/quizzes/${quiz.id}/file`)

    expect(response.status).toBe(400)
  })

  it('returns 404 for a quiz that does not exist in the course', async () => {
    const { app, users } = createTestApp()
    const agent = await signInAgent(users, app, 'trainer@example.com')
    const courseId = await createCourse(agent)

    const response = await agent
      .put(`/api/courses/${courseId}/quizzes/not-a-real-id/file`)
      .attach('file', Buffer.from('<xml/>'), 'quiz.xml')

    expect(response.status).toBe(404)
  })
})

describe('malformed course id (ROUTE-ID-GUARD-001)', () => {
  it('returns 404, not a crash, for a non-UUID-shaped course id', async () => {
    // given: a signed-in trainer
    const { app, users } = createTestApp()
    const agent = await signInAgent(users, app, 'trainer@example.com')

    // when: listing quizzes for a malformed (non-UUID) course id — the
    // fake repository throws for this, the same way real Postgres does
    // for a value it can't parse as a `uuid` (SQLSTATE 22P02)
    const response = await agent.get('/api/courses/does-not-exist/quizzes')

    // then: it is rejected as not found, same shape as a valid-but-missing
    // id — not an unhandled rejection that would crash the process
    expect(response.status).toBe(404)
    expect(response.body).toEqual({ error: 'course_not_found' })
  })

  it('leaves the server able to answer a following request', async () => {
    // given: a signed-in trainer
    const { app, users } = createTestApp()
    const agent = await signInAgent(users, app, 'trainer@example.com')

    // when: a malformed-id request is immediately followed by a normal one
    await agent.get('/api/courses/does-not-exist/quizzes')
    const response = await agent.get('/api/courses')

    // then: the second request is served normally
    expect(response.status).toBe(200)
  })
})
