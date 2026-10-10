import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import QRCode from 'qrcode'
import { Check, ExternalLink } from 'lucide-react'
import AppHeader from './components/AppHeader'
import Breadcrumb from './components/Breadcrumb'
import { Card } from './components/ui/card'
import { Input } from './components/ui/input'
import { Button } from './components/ui/button'
import { useSignedInUser } from './lib/session'

type SessionStatus = 'closed' | 'running' | 'stopped'

interface QuizSession {
  id: string
  quizId: string
  status: SessionStatus
  timeLimitSeconds: number | null
  startedAt: string | null
  closesAt: string | null
  stoppedAt: string | null
  takeUrl: string
  joinedCount: number
  submittedCount: number
}

const POLL_INTERVAL_MS = 3000

interface ConnectionResult {
  connectionId: string
  totalScore: number
  maxScore: number
  hasUngraded: boolean
}

interface SessionResults {
  connections: ConnectionResult[]
  classAverage: number | null
}

interface AnswerBucket {
  label: string
  count: number
  isCorrect: boolean
}

interface ItemAnswerBreakdown {
  itemIdentifier: string
  prompt?: string
  buckets: AnswerBucket[]
  noAnswerCount: number
  respondentCount: number
}

interface AnswerBreakdownResponse {
  items: ItemAnswerBreakdown[]
}

function formatClockTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

/** e.g. "39m" or "1h 05m" — rounds down, never negative (0m floor). */
function formatDurationRemaining(closesAtIso: string, now: Date) {
  const remainingMs = Math.max(0, new Date(closesAtIso).getTime() - now.getTime())
  const totalMinutes = Math.floor(remainingMs / 60000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return hours > 0 ? `${hours}h ${String(minutes).padStart(2, '0')}m` : `${minutes}m`
}

/** Block #2's time-remaining bar: 100% at start, 0% once closesAt passes. */
function timeRemainingPercent(startedAtIso: string | null, closesAtIso: string, now: Date) {
  if (!startedAtIso) return 0
  const startedAt = new Date(startedAtIso).getTime()
  const closesAt = new Date(closesAtIso).getTime()
  const total = closesAt - startedAt
  if (total <= 0) return 0
  const remaining = Math.max(0, closesAt - now.getTime())
  return Math.round((remaining / total) * 100)
}

/**
 * `/quiz-sessions/:sessionId` (QUIZ-SESSION-CONTROL-001): the "Quiz
 * Session Monitor" page — a QR code + plain-text URL for students to
 * join, Block #1 (session lifecycle: closed -> start, running -> stop,
 * always reopenable), and a static Block #2 placeholder (real live
 * counts are QUIZ-SESSION-LIVE-STATUS-001's scope, not this one's).
 *
 * `takeUrl` is never built client-side (ADR-0008) — it comes from the
 * server, computed from `APP_BASE_URL`, since a phone scanning the QR
 * code can't resolve this browser's own `window.location.origin`.
 *
 * Block #2's counts (QUIZ-SESSION-LIVE-STATUS-001) are polled — per
 * ADR-0009, revised at that story's sprint planning to poll while
 * `closed` too, not just `running`, since a joined count before start is
 * part of the DoD. Polling stops once `stopped`. A side effect: this also
 * self-corrects Block #1 if `closesAt` passes without an explicit Stop —
 * the server derives `stopped` on its next poll response, where a
 * client-only countdown alone would never notice.
 */
function QuizSessionMonitorPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const { user, logout } = useSignedInUser()
  const [session, setSession] = useState<QuizSession | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [timeLimitInput, setTimeLimitInput] = useState('')
  // QUIZ-RANDOM-QUESTION-ORDER-001/QUIZ-RANDOM-ANSWER-ORDER-001: both
  // default off — off means "honor the quiz's own authored `shuffle`
  // attribute" (ADR-0013), not "never shuffle". Independent toggles, sent
  // alongside `timeLimit` in the same `/start` body the tech PBI's route
  // already accepts `forceShuffleQuestions`/`forceShuffleAnswers` on.
  const [forceShuffleQuestions, setForceShuffleQuestions] = useState(false)
  const [forceShuffleAnswers, setForceShuffleAnswers] = useState(false)
  const [qrSvg, setQrSvg] = useState<string | null>(null)
  const [now, setNow] = useState(() => new Date())
  const [results, setResults] = useState<SessionResults | null>(null)
  const [answerBreakdown, setAnswerBreakdown] = useState<AnswerBreakdownResponse | null>(null)

  const loadSession = useCallback(async () => {
    if (!sessionId) return
    const response = await fetch(`/api/quiz-sessions/${sessionId}`)
    if (response.status === 200) {
      setSession(await response.json())
      setLoadError(false)
    } else {
      setSession(null)
      setLoadError(true)
    }
  }, [sessionId])

  useEffect(() => {
    loadSession()
  }, [loadSession])

  useEffect(() => {
    if (!session || session.status === 'stopped') return
    const interval = setInterval(loadSession, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [session?.status, loadSession])

  // Block #1's clock/duration-remaining display ticks on its own —
  // ADR-0009's polling decision is for QUIZ-SESSION-LIVE-STATUS-001's
  // Block #2 counts, not this purely-derived-from-closesAt display.
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  // QUIZ-AUTO-EVAL-001: Block #3 fetches once, on the same status
  // transition that already reveals Block #2's post-stop state — no new
  // polling, results don't change after the session is stopped.
  useEffect(() => {
    if (!sessionId || session?.status !== 'stopped') return
    let cancelled = false
    fetch(`/api/quiz-sessions/${sessionId}/results`).then(async (response) => {
      if (cancelled || response.status !== 200) return
      const body = await response.json()
      if (Array.isArray(body?.connections)) setResults(body)
    })
    return () => {
      cancelled = true
    }
  }, [sessionId, session?.status])

  // QUIZ-CLASS-REVIEW-001: Block #4 fetches once, on the same status
  // transition as Block #3 — same "no new polling, nothing changes after
  // stop" reasoning.
  useEffect(() => {
    if (!sessionId || session?.status !== 'stopped') return
    let cancelled = false
    fetch(`/api/quiz-sessions/${sessionId}/answer-breakdown`).then(async (response) => {
      if (cancelled || response.status !== 200) return
      const body = await response.json()
      if (Array.isArray(body?.items)) setAnswerBreakdown(body)
    })
    return () => {
      cancelled = true
    }
  }, [sessionId, session?.status])

  useEffect(() => {
    if (!session) {
      setQrSvg(null)
      return
    }
    QRCode.toString(session.takeUrl, { type: 'svg' }).then(setQrSvg)
    // Depends on takeUrl specifically, not the whole session object — once
    // QUIZ-SESSION-LIVE-STATUS-001 starts polling this page for live
    // counts, `session` is a new object every poll tick even though the
    // URL never changes; regenerating the QR SVG every cycle would be
    // wasted work for no visible difference.
  }, [session?.takeUrl])

  async function handleStart() {
    if (!sessionId) return
    setActionError(null)
    const response = await fetch(`/api/quiz-sessions/${sessionId}/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        timeLimit: timeLimitInput.trim() || undefined,
        forceShuffleQuestions,
        forceShuffleAnswers,
      }),
    })
    if (response.status === 200) {
      setTimeLimitInput('')
      setForceShuffleQuestions(false)
      setForceShuffleAnswers(false)
      await loadSession()
    } else {
      setActionError('Could not start the session. Check the time limit format (e.g. 3h or 75m).')
    }
  }

  async function handleStop() {
    if (!sessionId) return
    setActionError(null)
    const response = await fetch(`/api/quiz-sessions/${sessionId}/stop`, { method: 'POST' })
    if (response.status === 200) {
      await loadSession()
    } else {
      setActionError('Could not stop the session. Try again.')
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-paper">
      <AppHeader user={user} onLogout={logout} />

      <Breadcrumb />

      <main className="flex-1 px-6 py-section-gap">
        {!user ? (
          <p className="text-ink/70">
            <a href="/login" className="text-ink underline underline-offset-2 hover:text-brass">
              Sign in
            </a>{' '}
            to view this session.
          </p>
        ) : loadError || !session ? (
          <p className="text-sm text-error">Could not load this session. Try reloading the page.</p>
        ) : (
          <div className="mx-auto grid max-w-4xl gap-section-gap md:grid-cols-2">
            <div className="flex flex-col gap-group-gap">
              {qrSvg && (
                <div
                  data-testid="session-qr-code"
                  className="w-40"
                  // qrcode's `toString(..., { type: 'svg' })` output — a
                  // plain SVG markup string, no canvas element needed
                  // (jsdom has none), per ADR-0008.
                  dangerouslySetInnerHTML={{ __html: qrSvg }}
                />
              )}
              <a
                href={session.takeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 break-all rounded border border-border bg-white px-3 py-2 text-sm text-ink"
              >
                {session.takeUrl}
                <ExternalLink className="size-4 shrink-0" aria-hidden="true" />
              </a>

              <Card>
                <h2 className="mb-3 text-sm font-medium text-ink">Session control</h2>
                {actionError && <p className="mb-2 text-sm text-error">{actionError}</p>}
                {session.status === 'running' ? (
                  <div className="flex flex-col gap-2">
                    {session.closesAt && (
                      <p className="text-sm text-ink">
                        Closes at {formatClockTime(session.closesAt)} &middot; {formatDurationRemaining(session.closesAt, now)} remaining
                      </p>
                    )}
                    <p className="text-sm text-ink/70">Running</p>
                    <Button type="button" onClick={handleStop}>
                      Stop
                    </Button>
                  </div>
                ) : (
                  // 'closed' (never started) and 'stopped' (always
                  // reopenable, per the DoD — "closed is not a dead end")
                  // both show the same time-limit input + Start button.
                  <div className="flex flex-col gap-2">
                    {session.status === 'stopped' && <p className="text-sm text-ink/70">Stopped</p>}
                    <label htmlFor="time-limit" className="text-xs text-ink/70">
                      Time limit (optional, e.g. 3h or 75m)
                    </label>
                    <Input
                      id="time-limit"
                      value={timeLimitInput}
                      onChange={(event) => setTimeLimitInput(event.target.value)}
                      placeholder="e.g. 75m"
                    />
                    <label className="flex items-center gap-2 text-sm text-ink">
                      <input
                        type="checkbox"
                        id="force-shuffle-questions"
                        checked={forceShuffleQuestions}
                        onChange={(event) => setForceShuffleQuestions(event.target.checked)}
                      />
                      Force shuffle questions
                    </label>
                    <label className="flex items-center gap-2 text-sm text-ink">
                      <input
                        type="checkbox"
                        id="force-shuffle-answers"
                        checked={forceShuffleAnswers}
                        onChange={(event) => setForceShuffleAnswers(event.target.checked)}
                      />
                      Force shuffle answers
                    </label>
                    <Button type="button" onClick={handleStart}>
                      {session.status === 'stopped' ? 'Reopen' : 'Start'}
                    </Button>
                  </div>
                )}
              </Card>
            </div>

            <Card data-testid="block-2-live-status">
              <h2 className="mb-3 text-sm font-medium text-ink">Live status</h2>
              {session.status === 'closed' && (
                <p className="text-sm text-ink/70">Quiz not yet started. {session.joinedCount} joined so far.</p>
              )}
              {session.status === 'running' && (
                <div className="flex flex-col gap-2">
                  <p className="text-sm text-ink/70">
                    {session.submittedCount}/{session.joinedCount} answered
                  </p>
                  <div className="h-2 w-full rounded bg-ink-50" role="progressbar" aria-label="Answers submitted">
                    <div
                      className="h-2 rounded bg-brass"
                      style={{ width: `${session.joinedCount > 0 ? Math.round((session.submittedCount / session.joinedCount) * 100) : 0}%` }}
                    />
                  </div>
                  {session.closesAt && (
                    <div className="h-2 w-full rounded bg-ink-50" role="progressbar" aria-label="Time remaining">
                      <div
                        className="h-2 rounded bg-ink"
                        style={{ width: `${timeRemainingPercent(session.startedAt, session.closesAt, now)}%` }}
                      />
                    </div>
                  )}
                </div>
              )}
              {session.status === 'stopped' && (
                <p className="text-sm text-ink/70">
                  Session ended. {session.submittedCount}/{session.joinedCount} submitted.
                </p>
              )}
            </Card>

            {session.status === 'stopped' && results && (
              <Card data-testid="block-3-results" className="md:col-span-2">
                <h2 className="mb-3 text-sm font-medium text-ink">Results</h2>
                {/* classAverage is a mean of per-connection score ratios, not raw totals — shown as a percentage, since there's no single shared denominator. */}
                <p className="mb-3 text-sm text-ink">
                  Class average: {results.classAverage === null ? '—' : `${Math.round(results.classAverage * 100)}%`}
                </p>
                {/* TABLE-STYLE-001: left as plain markup, not the shared `Table` primitives —
                    this is a small summary widget inside Block #3's own `Card`, aligned against
                    the "Results"/"Class average" text right above it in the same panel, not a
                    list page in the DoD's sense (quiz list / sessions list). Reusing the shared
                    header background + full-width padding here misaligned it against its
                    siblings and doubled up on framing already provided by the surrounding Card. */}
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="text-ink/70">
                      <th className="pb-1 font-medium">Student (connection)</th>
                      <th className="pb-1 font-medium">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.connections.map((connection) => (
                      <tr key={connection.connectionId}>
                        <td className="pr-4 py-1 text-ink/70">{connection.connectionId}</td>
                        <td className="py-1 text-ink">
                          {connection.hasUngraded && connection.maxScore === 0
                            ? 'needs manual grading'
                            : `${connection.totalScore} / ${connection.maxScore}${connection.hasUngraded ? ' (some items need manual grading)' : ''}`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            )}

            {session.status === 'stopped' && answerBreakdown && (
              <Card data-testid="block-4-answer-breakdown" className="md:col-span-2">
                <h2 className="mb-3 text-sm font-medium text-ink">Answer breakdown</h2>
                <div className="flex flex-col gap-group-gap">
                  {answerBreakdown.items.map((item) => {
                    const total = item.respondentCount
                    return (
                      <div
                        key={item.itemIdentifier}
                        data-testid={`item-breakdown-${item.itemIdentifier}`}
                        className="border-t border-border pt-3 first:border-t-0 first:pt-0"
                      >
                        {item.prompt && <p className="mb-2 text-sm font-medium text-ink">{item.prompt}</p>}
                        <ul className="flex flex-col gap-1">
                          {item.buckets.map((bucket) => (
                            <li key={bucket.label} className="flex items-center gap-2 text-sm">
                              <span className="w-4 shrink-0">
                                {bucket.isCorrect && <Check className="size-4 shrink-0 text-brass" aria-label="correct answer" />}
                              </span>
                              <span className={bucket.isCorrect ? 'w-32 shrink-0 font-medium text-ink' : 'w-32 shrink-0 text-ink/70'}>{bucket.label}</span>
                              <div className="h-2 flex-1 rounded bg-ink-50">
                                <div
                                  className="h-2 rounded bg-brass"
                                  style={{ width: `${total > 0 ? Math.round((bucket.count / total) * 100) : 0}%` }}
                                />
                              </div>
                              <span className="w-6 text-right text-ink/70">{bucket.count}</span>
                            </li>
                          ))}
                          {item.noAnswerCount > 0 && (
                            <li className="flex items-center gap-2 text-sm text-ink/50">
                              <span className="w-4 shrink-0" />
                              <span className="flex-1">No answer</span>
                              <span className="w-6 text-right">{item.noAnswerCount}</span>
                            </li>
                          )}
                        </ul>
                      </div>
                    )
                  })}
                </div>
              </Card>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

export default QuizSessionMonitorPage
