import { Router, type RequestHandler } from 'express'
import type { SessionRepository, QuizSession } from '../db/quizSessions.js'
import type { ConnectionRepository } from '../db/quizSessionConnections.js'
import type { QuizSessionAnswerRepository } from '../db/quizSessionAnswers.js'
import type { QuizRepository } from '../db/quizzes.js'
import { isInvalidIdError } from '../db/errors.js'
import { appBaseUrl } from '../config.js'
import { resolveQuizItems } from '../qti/resolveQtiItems.js'
import { scoreChoiceAnswer } from '../qti/scoreAnswer.js'
import { computeAnswerBreakdown } from '../qti/answerBreakdown.js'
import { resolveDeliveryOrder, applyDeliveryOrder } from '../qti/deliveryOrder.js'
import type { GradingStatus } from '../db/quizSessionAnswers.js'

export interface ItemResult {
  itemIdentifier: string
  gradingStatus: GradingStatus
  score: number | null
  maxScore: number
}

export type SessionStatus = 'closed' | 'running' | 'stopped'

export interface QuizSessionResponse {
  id: string
  quizId: string
  status: SessionStatus
  timeLimitSeconds: number | null
  startedAt: string | null
  closesAt: string | null
  stoppedAt: string | null
  // QUIZ-SESSION-PER-STUDENT-DELIVERY-001: settable via /start, alongside
  // timeLimit. Trainer-facing UI for toggling these is out of this tech
  // PBI's scope — each of QUIZ-RANDOM-QUESTION-ORDER-001/
  // QUIZ-RANDOM-ANSWER-ORDER-001 owns its own toggle, reading this field.
  forceShuffleQuestions: boolean
  forceShuffleAnswers: boolean
  takeUrl: string
  // QUIZ-SESSION-LIVE-STATUS-001: folded into this same response rather
  // than a separate `/status` endpoint — the monitor page already polls
  // this one, and there's no other consumer that wants a session without
  // its counts.
  joinedCount: number
  submittedCount: number
}

/**
 * QUIZ-SESSION-CONTROL-001: no stored `status` column (see
 * `db/quizSessions.ts`) — derived here on every read instead, including
 * auto-close once `closesAt` has passed, so nothing else (a cron job, a
 * background timer) has to flip a value at the deadline. `now` is a
 * parameter, not `new Date()` read internally, purely so tests can pass a
 * fixed clock instead of racing real time.
 */
export function deriveStatus(session: Pick<QuizSession, 'startedAt' | 'closesAt' | 'stoppedAt'>, now: Date): SessionStatus {
  if (!session.startedAt) return 'closed'
  if (session.stoppedAt) return 'stopped'
  if (session.closesAt && session.closesAt.getTime() <= now.getTime()) return 'stopped'
  return 'running'
}

function toResponse(session: QuizSession, now: Date, counts: { joinedCount: number; submittedCount: number }): QuizSessionResponse {
  return {
    id: session.id,
    quizId: session.quizId,
    status: deriveStatus(session, now),
    timeLimitSeconds: session.timeLimitSeconds,
    startedAt: session.startedAt?.toISOString() ?? null,
    closesAt: session.closesAt?.toISOString() ?? null,
    stoppedAt: session.stoppedAt?.toISOString() ?? null,
    forceShuffleQuestions: session.forceShuffleQuestions,
    forceShuffleAnswers: session.forceShuffleAnswers,
    takeUrl: `${appBaseUrl()}/quiz-sessions/${session.id}/take`,
    joinedCount: counts.joinedCount,
    submittedCount: counts.submittedCount,
  }
}

/**
 * Accepts `<positive integer>h` or `<positive integer>m` (case
 * insensitive) — e.g. `3h`, `75m` — per the DoD's wireframe-matching
 * format. Returns `null` for an omitted/empty value (no time limit is a
 * valid, non-error choice) and `'invalid'` for anything that doesn't
 * parse as a positive count of hours/minutes, so a route can tell "no
 * limit" apart from "bad input" and only reject the latter.
 */
export function parseTimeLimit(input: unknown): number | null | 'invalid' {
  if (input === undefined || input === null || input === '') return null
  if (typeof input !== 'string') return 'invalid'
  const match = /^(\d+)(h|m)$/i.exec(input.trim())
  if (!match) return 'invalid'
  const amount = Number(match[1])
  if (amount <= 0) return 'invalid'
  const unit = match[2].toLowerCase()
  return unit === 'h' ? amount * 3600 : amount * 60
}

/**
 * `forceShuffleQuestions`/`forceShuffleAnswers` in `/start`'s body
 * (ADR-0013): an omitted value defaults to `false` (no trainer action
 * required to keep today's behavior for a session that never sets these);
 * anything present but not a boolean is rejected as `'invalid'`, the same
 * "tell a caller apart from a bad value" shape `parseTimeLimit` uses.
 */
export function parseForceShuffle(input: unknown): boolean | 'invalid' {
  if (input === undefined || input === null) return false
  if (typeof input !== 'boolean') return 'invalid'
  return input
}

/**
 * `POST /api/quizzes/:quizId/sessions` (create), `POST
 * /api/quiz-sessions/:sessionId/start` (also reopen — see
 * `db/quizSessions.ts`'s `start`), `POST /api/quiz-sessions/:sessionId
 * /stop`, `GET /api/quiz-sessions/:sessionId` — every one of these is
 * trainer-facing and requires a tenant. `POST .../connections` and `POST
 * .../connections/:connectionId/submit` (QUIZ-SESSION-LIVE-STATUS-001)
 * are the opposite: an anonymous student's phone hit these after
 * scanning a QR code, with no session/tenant of any kind, so they skip
 * `sessionMiddleware` entirely and accept a connection regardless of the
 * session's own status (joining before start is exactly what the DoD
 * wants counted).
 *
 * QUIZ-TAKE-RENDER-001 adds three more anonymous, no-tenant routes for the
 * same reason: `GET .../status` (the take page's not-started/running/
 * stopped gate), `GET .../connections/:connectionId/items` (resolved item
 * XML in that connection's own effective order, per
 * QUIZ-SESSION-PER-STUDENT-DELIVERY-001/ADR-0013 — `running` only, `409`
 * otherwise, so the questions aren't fetchable by URL before the session
 * starts), and `POST .../connections/:connectionId/answers` (records one
 * item's response, or the `'ungraded'` placeholder for an unsupported
 * interaction type).
 *
 * Every id-in-URL lookup here — tenant-scoped or not — follows
 * ROUTE-ID-GUARD-001's pattern: wrapped in try/catch, a malformed id
 * folded into the same 404 as a genuinely missing row.
 */
export function createQuizSessionsRouter(
  sessions: SessionRepository,
  connections: ConnectionRepository,
  sessionMiddleware: RequestHandler,
  answers: QuizSessionAnswerRepository,
  quizzes: QuizRepository,
): Router {
  const router = Router()

  function requireTenant(req: import('express').Request, res: import('express').Response): string | null {
    if (!req.session.tenantId) {
      res.status(401).json({ error: 'not_signed_in' })
      return null
    }
    return req.session.tenantId
  }

  // BUG-BREADCRUMB-NAV: resolves quiz -> course for the shared breadcrumb
  // (session -> quiz is already covered by `GET /api/quiz-sessions/:sessionId`'s
  // own `quizId` field, no new lookup needed there).
  router.get('/api/quizzes/:quizId', sessionMiddleware, async (req, res) => {
    const tenantId = requireTenant(req, res)
    if (!tenantId) return
    try {
      const quiz = await quizzes.findByIdWithCourseForTenant(req.params.quizId, tenantId)
      if (!quiz) {
        res.status(404).json({ error: 'quiz_not_found' })
        return
      }
      res.status(200).json(quiz)
    } catch (err) {
      if (isInvalidIdError(err)) {
        res.status(404).json({ error: 'quiz_not_found' })
        return
      }
      console.error('get quiz failed:', err)
      res.status(500).json({ error: 'internal_error' })
    }
  })

  router.post('/api/quizzes/:quizId/sessions', sessionMiddleware, async (req, res) => {
    const tenantId = requireTenant(req, res)
    if (!tenantId) return
    try {
      const created = await sessions.createForQuiz(req.params.quizId, tenantId)
      if (!created) {
        res.status(404).json({ error: 'quiz_not_found' })
        return
      }
      res.status(201).json(toResponse(created, new Date(), { joinedCount: 0, submittedCount: 0 }))
    } catch (err) {
      if (isInvalidIdError(err)) {
        res.status(404).json({ error: 'quiz_not_found' })
        return
      }
      console.error('create quiz session failed:', err)
      res.status(500).json({ error: 'internal_error' })
    }
  })

  // QUIZ-SESSION-HISTORY-001: every session ever created for one quiz,
  // newest first, so a trainer can reach a past run without having kept
  // the URL "Create session" redirected them to originally.
  router.get('/api/quizzes/:quizId/sessions', sessionMiddleware, async (req, res) => {
    const tenantId = requireTenant(req, res)
    if (!tenantId) return
    try {
      const rows = await sessions.listForQuiz(req.params.quizId, tenantId)
      if (!rows) {
        res.status(404).json({ error: 'quiz_not_found' })
        return
      }
      const now = new Date()
      const responses = await Promise.all(
        rows.map(async (session) => toResponse(session, now, await connections.countsForSession(session.id))),
      )
      res.status(200).json(responses)
    } catch (err) {
      if (isInvalidIdError(err)) {
        res.status(404).json({ error: 'quiz_not_found' })
        return
      }
      console.error('list quiz sessions failed:', err)
      res.status(500).json({ error: 'internal_error' })
    }
  })

  router.post('/api/quiz-sessions/:sessionId/start', sessionMiddleware, async (req, res) => {
    const tenantId = requireTenant(req, res)
    if (!tenantId) return

    const timeLimitSeconds = parseTimeLimit(req.body?.timeLimit)
    if (timeLimitSeconds === 'invalid') {
      res.status(400).json({ error: 'invalid_time_limit' })
      return
    }
    const forceShuffleQuestions = parseForceShuffle(req.body?.forceShuffleQuestions)
    if (forceShuffleQuestions === 'invalid') {
      res.status(400).json({ error: 'invalid_force_shuffle_questions' })
      return
    }
    const forceShuffleAnswers = parseForceShuffle(req.body?.forceShuffleAnswers)
    if (forceShuffleAnswers === 'invalid') {
      res.status(400).json({ error: 'invalid_force_shuffle_answers' })
      return
    }

    try {
      const started = await sessions.start(req.params.sessionId, tenantId, timeLimitSeconds, forceShuffleQuestions, forceShuffleAnswers)
      if (!started) {
        res.status(404).json({ error: 'session_not_found' })
        return
      }
      const counts = await connections.countsForSession(started.id)
      res.status(200).json(toResponse(started, new Date(), counts))
    } catch (err) {
      if (isInvalidIdError(err)) {
        res.status(404).json({ error: 'session_not_found' })
        return
      }
      console.error('start quiz session failed:', err)
      res.status(500).json({ error: 'internal_error' })
    }
  })

  router.post('/api/quiz-sessions/:sessionId/stop', sessionMiddleware, async (req, res) => {
    const tenantId = requireTenant(req, res)
    if (!tenantId) return
    try {
      const stopped = await sessions.stop(req.params.sessionId, tenantId)
      if (!stopped) {
        res.status(404).json({ error: 'session_not_found' })
        return
      }
      const counts = await connections.countsForSession(stopped.id)
      res.status(200).json(toResponse(stopped, new Date(), counts))
    } catch (err) {
      if (isInvalidIdError(err)) {
        res.status(404).json({ error: 'session_not_found' })
        return
      }
      console.error('stop quiz session failed:', err)
      res.status(500).json({ error: 'internal_error' })
    }
  })

  router.get('/api/quiz-sessions/:sessionId', sessionMiddleware, async (req, res) => {
    const tenantId = requireTenant(req, res)
    if (!tenantId) return
    try {
      const session = await sessions.findByIdForTenant(req.params.sessionId, tenantId)
      if (!session) {
        res.status(404).json({ error: 'session_not_found' })
        return
      }
      const counts = await connections.countsForSession(session.id)
      res.status(200).json(toResponse(session, new Date(), counts))
    } catch (err) {
      if (isInvalidIdError(err)) {
        res.status(404).json({ error: 'session_not_found' })
        return
      }
      console.error('get quiz session failed:', err)
      res.status(500).json({ error: 'internal_error' })
    }
  })

  // QUIZ-AUTO-EVAL-001: trainer-facing, tenant-scoped — deliberately a
  // separate endpoint from `GET .../:sessionId` rather than folded into
  // it, since results only exist once `stopped` and every other session
  // field is needed well before that. `409`, not `403` — the results
  // aren't there yet, this isn't an authorization question.
  router.get('/api/quiz-sessions/:sessionId/results', sessionMiddleware, async (req, res) => {
    const tenantId = requireTenant(req, res)
    if (!tenantId) return
    try {
      const session = await sessions.findByIdForTenant(req.params.sessionId, tenantId)
      if (!session) {
        res.status(404).json({ error: 'session_not_found' })
        return
      }
      const status = deriveStatus(session, new Date())
      if (status !== 'stopped') {
        res.status(409).json({ error: 'results_not_available', status })
        return
      }

      // QUIZ-CONNECTION-INTEGRITY-001: a connection that only ever joined
      // (never called .../submit) never took the quiz — exclude it here
      // rather than in the repository, since every other consumer of
      // connection rows (joinedCount, etc.) still wants every join.
      const connectionRows = (await connections.listForSession(session.id)).filter((connection) => connection.submittedAt !== null)
      const perConnection = await Promise.all(
        connectionRows.map(async (connection) => {
          const rows = await answers.listForConnection(connection.id)
          return {
            connectionId: connection.id,
            totalScore: rows.filter((row) => row.gradingStatus === 'graded').reduce((sum, row) => sum + (row.score ?? 0), 0),
            maxScore: rows.reduce((sum, row) => sum + row.maxScore, 0),
            hasUngraded: rows.some((row) => row.gradingStatus === 'ungraded'),
          }
        }),
      )
      // Mean of each connection's own totalScore/maxScore ratio, not a mean
      // of raw totals — a connection that hit more ungraded items has a
      // smaller denominator, not a smaller numerator, so averaging raw
      // totals would unfairly penalize it. A connection with maxScore 0
      // (every item ungraded) is excluded from the mean entirely, not
      // treated as a 0.
      const withScorableItems = perConnection.filter((connection) => connection.maxScore > 0)
      const classAverage =
        withScorableItems.length > 0
          ? withScorableItems.reduce((sum, connection) => sum + connection.totalScore / connection.maxScore, 0) / withScorableItems.length
          : null

      res.status(200).json({ connections: perConnection, classAverage })
    } catch (err) {
      if (isInvalidIdError(err)) {
        res.status(404).json({ error: 'session_not_found' })
        return
      }
      console.error('get quiz session results failed:', err)
      res.status(500).json({ error: 'internal_error' })
    }
  })

  // QUIZ-CLASS-REVIEW-001: trainer-facing, tenant-scoped — same
  // stopped-only `409` gate as `.../results`, and the same "only real
  // attempts count" connection filter (QUIZ-CONNECTION-INTEGRITY-001).
  // Item order follows `resolveQuizItems`'s own ordering.
  router.get('/api/quiz-sessions/:sessionId/answer-breakdown', sessionMiddleware, async (req, res) => {
    const tenantId = requireTenant(req, res)
    if (!tenantId) return
    try {
      const session = await sessions.findByIdForTenant(req.params.sessionId, tenantId)
      if (!session) {
        res.status(404).json({ error: 'session_not_found' })
        return
      }
      const status = deriveStatus(session, new Date())
      if (status !== 'stopped') {
        res.status(409).json({ error: 'results_not_available', status })
        return
      }

      const connectionRows = (await connections.listForSession(session.id)).filter((connection) => connection.submittedAt !== null)
      const perConnectionAnswers = await Promise.all(connectionRows.map((connection) => answers.listForConnection(connection.id)))

      const files = await quizzes.getFilesByQuizId(session.quizId)
      const items = resolveQuizItems(files)

      const breakdown = items.map((item) => {
        const responsesPerConnection = perConnectionAnswers.map((rows) => rows.find((row) => row.itemIdentifier === item.identifier)?.responses)
        const { prompt, buckets, noAnswerCount, respondentCount } = computeAnswerBreakdown(item.xml, responsesPerConnection)
        return { itemIdentifier: item.identifier, prompt, buckets, noAnswerCount, respondentCount }
      })

      res.status(200).json({ items: breakdown })
    } catch (err) {
      if (isInvalidIdError(err)) {
        res.status(404).json({ error: 'session_not_found' })
        return
      }
      console.error('get quiz session answer breakdown failed:', err)
      res.status(500).json({ error: 'internal_error' })
    }
  })

  // QUIZ-SESSION-LIVE-STATUS-001: anonymous — no sessionMiddleware, no
  // tenant. Accepts a join in any session status (a `closed` session's
  // joined count is part of the DoD).
  // QUIZ-CONNECTION-INTEGRITY-001: a `stopped` session must stop accepting
  // new joins — `closed` (pre-start lobby, QUIZ-SESSION-LIVE-STATUS-001) and
  // `running` are unaffected.
  router.post('/api/quiz-sessions/:sessionId/connections', async (req, res) => {
    try {
      const session = await sessions.findById(req.params.sessionId)
      if (!session) {
        res.status(404).json({ error: 'session_not_found' })
        return
      }
      const status = deriveStatus(session, new Date())
      if (status === 'stopped') {
        res.status(409).json({ error: 'session_not_running', status })
        return
      }
      const connection = await connections.create(req.params.sessionId)
      if (!connection) {
        res.status(404).json({ error: 'session_not_found' })
        return
      }
      res.status(201).json({ id: connection.id })
    } catch (err) {
      if (isInvalidIdError(err)) {
        res.status(404).json({ error: 'session_not_found' })
        return
      }
      console.error('create quiz session connection failed:', err)
      res.status(500).json({ error: 'internal_error' })
    }
  })

  // QUIZ-TAKE-RENDER-001: anonymous — the take page's session-status gate
  // (not-started / running / stopped). Deliberately just `{ status }`, not
  // `toResponse`'s full shape — no counts, no `quizId`, nothing trainer-only
  // leaks to an anonymous caller.
  router.get('/api/quiz-sessions/:sessionId/status', async (req, res) => {
    try {
      const session = await sessions.findById(req.params.sessionId)
      if (!session) {
        res.status(404).json({ error: 'session_not_found' })
        return
      }
      res.status(200).json({ status: deriveStatus(session, new Date()) })
    } catch (err) {
      if (isInvalidIdError(err)) {
        res.status(404).json({ error: 'session_not_found' })
        return
      }
      console.error('get quiz session status failed:', err)
      res.status(500).json({ error: 'internal_error' })
    }
  })

  // QUIZ-TAKE-RENDER-001, replaced by QUIZ-SESSION-PER-STUDENT-DELIVERY-001:
  // anonymous — resolves the session's quiz package (ADR-0010's quiz_files)
  // into the ordered item list this connection's attempt renders. Served
  // only while `running`: a `closed`/`stopped` session returns `409`, not
  // the questions, so the take-URL alone can't be used to read the quiz
  // before/after the window the trainer opened it for. Now
  // connection-scoped (`.../connections/:connectionId/items`, following the
  // existing `.../connections/:connectionId/answers` convention) instead of
  // session-scoped: every student in the same session can get a different
  // effective order (ADR-0013), so "the items" is no longer a single
  // session-wide answer.
  //
  // The order is generated once per connection, on its first fetch here,
  // and persisted via `ConnectionRepository.setOrderIfUnset`'s atomic
  // conditional UPDATE — a second (or double-fired-mount-effect) call for
  // the same connection reads back the same persisted order instead of
  // generating (and racing) a second permutation.
  router.get('/api/quiz-sessions/:sessionId/connections/:connectionId/items', async (req, res) => {
    try {
      const session = await sessions.findById(req.params.sessionId)
      if (!session) {
        res.status(404).json({ error: 'session_not_found' })
        return
      }
      const status = deriveStatus(session, new Date())
      if (status !== 'running') {
        res.status(409).json({ error: 'session_not_running', status })
        return
      }
      const connection = await connections.findForSession(req.params.connectionId, req.params.sessionId)
      if (!connection) {
        res.status(404).json({ error: 'connection_not_found' })
        return
      }

      const files = await quizzes.getFilesByQuizId(session.quizId)
      const items = resolveQuizItems(files)
      const testFile = files.find((file) => file.relativePath === 'test.xml')
      const testXml = testFile ? testFile.fileData.toString('utf-8') : null

      let itemOrder = connection.itemOrder
      let choiceOrder = connection.choiceOrder
      if (itemOrder === null) {
        const generated = resolveDeliveryOrder(items, testXml, session.forceShuffleQuestions, session.forceShuffleAnswers)
        const persisted = await connections.setOrderIfUnset(connection.id, generated.itemOrder, generated.choiceOrder)
        itemOrder = persisted?.itemOrder ?? generated.itemOrder
        choiceOrder = persisted?.choiceOrder ?? generated.choiceOrder
      }

      const orderedItems = applyDeliveryOrder(items, { itemOrder: itemOrder ?? [], choiceOrder: choiceOrder ?? {} })
      res.status(200).json({
        items: orderedItems.map((item) => ({ identifier: item.identifier, path: item.path, xml: item.xml, supported: item.supported })),
      })
    } catch (err) {
      if (isInvalidIdError(err)) {
        res.status(404).json({ error: 'session_not_found' })
        return
      }
      console.error('get quiz session connection items failed:', err)
      res.status(500).json({ error: 'internal_error' })
    }
  })

  // QUIZ-TAKE-RENDER-001: anonymous — one call per item, on each
  // Next/Submit click. `supported`/`gradingStatus`/`maxScore` are derived
  // server-side from the same item resolution `GET .../items` uses, never
  // trusted from the client, so an anonymous caller can't mark an
  // unsupported item as scored (or vice versa) by sending a crafted body.
  router.post('/api/quiz-sessions/:sessionId/connections/:connectionId/answers', async (req, res) => {
    try {
      const session = await sessions.findById(req.params.sessionId)
      if (!session) {
        res.status(404).json({ error: 'session_not_found' })
        return
      }
      if (!(await connections.belongsToSession(req.params.connectionId, req.params.sessionId))) {
        res.status(404).json({ error: 'connection_not_found' })
        return
      }
      const itemPath = req.body?.itemPath
      if (typeof itemPath !== 'string' || itemPath.length === 0) {
        res.status(400).json({ error: 'invalid_item_path' })
        return
      }
      const files = await quizzes.getFilesByQuizId(session.quizId)
      const item = resolveQuizItems(files).find((candidate) => candidate.path === itemPath)
      if (!item) {
        res.status(404).json({ error: 'item_not_found' })
        return
      }
      const created = await answers.create({
        connectionId: req.params.connectionId,
        itemIdentifier: item.identifier,
        itemPath: item.path,
        responses: item.supported ? (req.body?.responses ?? null) : null,
        gradingStatus: item.supported ? 'pending' : 'ungraded',
        maxScore: item.supported ? 1 : 0,
      })
      res.status(201).json({ id: created.id })
    } catch (err) {
      if (isInvalidIdError(err)) {
        res.status(404).json({ error: 'session_not_found' })
        return
      }
      console.error('create quiz session answer failed:', err)
      res.status(500).json({ error: 'internal_error' })
    }
  })

  // QUIZ-AUTO-EVAL-001: extends the existing submit route (still anonymous)
  // rather than a separate endpoint — scoring happens once, right where
  // "the attempt is over" is already decided. Every `'pending'`
  // `quiz_session_answers` row for this connection is scored via
  // `qti3-core` and transitioned to `'graded'`; `'ungraded'` rows (the
  // interaction-type gate in the answers route above) are left untouched.
  // The response's `result` is what the take page's confirmation screen
  // renders the score line from directly — no extra round-trip.
  router.post('/api/quiz-sessions/:sessionId/connections/:connectionId/submit', async (req, res) => {
    try {
      const submitted = await connections.markSubmitted(req.params.connectionId, req.params.sessionId)
      if (!submitted) {
        res.status(404).json({ error: 'connection_not_found' })
        return
      }

      const session = await sessions.findById(req.params.sessionId)
      let result: { totalScore: number; maxScore: number; itemResults: ItemResult[] } | undefined

      if (session) {
        const files = await quizzes.getFilesByQuizId(session.quizId)
        const xmlByPath = new Map(files.map((file) => [file.relativePath, file.fileData.toString('utf-8')]))

        const pending = (await answers.listForConnection(req.params.connectionId)).filter((row) => row.gradingStatus === 'pending')
        for (const row of pending) {
          const xml = xmlByPath.get(row.itemPath)
          const score = xml ? scoreChoiceAnswer(xml, row.responses) : 0
          await answers.markGraded(row.id, score)
        }

        const allRows = await answers.listForConnection(req.params.connectionId)
        result = {
          totalScore: allRows.filter((row) => row.gradingStatus === 'graded').reduce((sum, row) => sum + (row.score ?? 0), 0),
          maxScore: allRows.reduce((sum, row) => sum + row.maxScore, 0),
          itemResults: allRows.map((row) => ({
            itemIdentifier: row.itemIdentifier,
            gradingStatus: row.gradingStatus,
            score: row.score,
            maxScore: row.maxScore,
          })),
        }
      }

      res.status(200).json(result ? { ok: true, result } : { ok: true })
    } catch (err) {
      if (isInvalidIdError(err)) {
        res.status(404).json({ error: 'connection_not_found' })
        return
      }
      console.error('submit quiz session connection failed:', err)
      res.status(500).json({ error: 'internal_error' })
    }
  })

  return router
}
