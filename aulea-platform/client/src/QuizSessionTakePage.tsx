import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { QtiAssessmentItemPlayer, type QtiAssessmentItemPlayerHandle } from '@longsightgroup/qti3-player-react'
import { Card } from './components/ui/card'
import { Button } from './components/ui/button'

type SessionStatus = 'closed' | 'running' | 'stopped'
type JoinState = 'joining' | 'joined' | 'error'

// BUG-QUIZ-REFRESH-DUP-SESSION: a browser-local token identifying "this
// student already joined this session," so a page refresh reuses the same
// connection instead of registering a new one. Scoped per sessionId, not a
// single global key, since the same browser can legitimately take several
// different quiz sessions over time.
function connectionStorageKey(sessionId: string) {
  return `quiz-session-connection:${sessionId}`
}

interface QuizItem {
  identifier: string
  path: string
  xml: string
  supported: boolean
}

/**
 * `/quiz-sessions/:sessionId/take` (QUIZ-TAKE-RENDER-001): the real
 * quiz-taking experience, replacing QUIZ-SESSION-LIVE-STATUS-001's
 * placeholder page. Still no sign-in of any kind — a student scanning a QR
 * code has no account (see `server/src/routes/quizSessions.ts`'s doc
 * comment for the full list of anonymous, no-tenant endpoints this page
 * calls).
 *
 * Joining (`POST .../connections`) happens on mount — a join before the
 * session starts is still counted (QUIZ-SESSION-LIVE-STATUS-001's DoD), but
 * a `stopped` session now rejects it with 409 (QUIZ-CONNECTION-INTEGRITY-001),
 * rendered the same as the pre-existing "ended" message. A page refresh
 * reuses the `connectionId` stashed in `localStorage` on first join instead
 * of joining again (BUG-QUIZ-REFRESH-DUP-SESSION) — see
 * `connectionStorageKey`. Status is fetched separately to decide what to
 * render; there is no polling here — the approved wireframe ("check back
 * once the trainer starts it") is a manual-refresh flow, not a live one.
 */
function QuizSessionTakePage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const [joinState, setJoinState] = useState<JoinState>('joining')
  const [connectionId, setConnectionId] = useState<string | null>(null)
  const [status, setStatus] = useState<SessionStatus | null>(null)
  const [items, setItems] = useState<QuizItem[] | null>(null)
  const [index, setIndex] = useState(0)
  const [submitted, setSubmitted] = useState(false)
  const [result, setResult] = useState<{ totalScore: number; maxScore: number } | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const playerRef = useRef<QtiAssessmentItemPlayerHandle>(null)

  useEffect(() => {
    if (!sessionId) return
    const currentSessionId = sessionId
    let cancelled = false

    async function load() {
      const storageKey = connectionStorageKey(currentSessionId)
      const storedConnectionId = localStorage.getItem(storageKey)

      // Local variable, not the connectionId state — state set below via
      // setConnectionId is not visible synchronously within this same
      // async function, so the items fetch after it needs its own
      // reference to build the connection-scoped URL from.
      let currentConnectionId: string

      if (storedConnectionId) {
        // Already joined this session in this browser (e.g. a refresh) —
        // reuse the connection instead of joining again.
        currentConnectionId = storedConnectionId
        setConnectionId(storedConnectionId)
        setJoinState('joined')
      } else {
        const joinResponse = await fetch(`/api/quiz-sessions/${sessionId}/connections`, { method: 'POST' })
        if (cancelled) return

        if (joinResponse.status !== 201) {
          // QUIZ-CONNECTION-INTEGRITY-001: a `stopped` session rejects the
          // join with 409 rather than accepting a ghost connection — render
          // the existing "ended" message, not a generic join error.
          if (joinResponse.status === 409) {
            const joinErrorBody = await joinResponse.json()
            if (joinErrorBody.status === 'stopped') {
              setStatus('stopped')
              setJoinState('joined')
              return
            }
          }
          setJoinState('error')
          return
        }
        const joinBody = await joinResponse.json()
        localStorage.setItem(storageKey, joinBody.id)
        currentConnectionId = joinBody.id
        setConnectionId(joinBody.id)
        setJoinState('joined')
      }

      const statusResponse = await fetch(`/api/quiz-sessions/${sessionId}/status`)
      if (cancelled || statusResponse.status !== 200) return
      const statusBody = await statusResponse.json()
      if (cancelled) return
      setStatus(statusBody.status)

      if (statusBody.status === 'running') {
        // QUIZ-SESSION-PER-STUDENT-DELIVERY-001: connection-scoped — this
        // connection's own effective (possibly per-student-shuffled) order,
        // not a single session-wide order.
        const itemsResponse = await fetch(`/api/quiz-sessions/${sessionId}/connections/${currentConnectionId}/items`)
        if (cancelled || itemsResponse.status !== 200) return
        const itemsBody = await itemsResponse.json()
        if (cancelled) return
        setItems(itemsBody.items)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [sessionId])

  async function recordCurrentAnswer(item: QuizItem) {
    const responses = item.supported ? (playerRef.current?.serialize()?.responses ?? null) : null
    await fetch(`/api/quiz-sessions/${sessionId}/connections/${connectionId}/answers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemPath: item.path, responses }),
    })
  }

  async function handleNext() {
    if (!items) return
    const item = items[index]
    setActionError(null)
    try {
      await recordCurrentAnswer(item)
    } catch {
      setActionError('Could not save your answer. Try again.')
      return
    }
    const isLast = index === items.length - 1
    if (!isLast) {
      setIndex((i) => i + 1)
      return
    }
    if (!sessionId || !connectionId) return
    const response = await fetch(`/api/quiz-sessions/${sessionId}/connections/${connectionId}/submit`, { method: 'POST' })
    if (response.status === 200) {
      const body = await response.json()
      // QUIZ-AUTO-EVAL-001: `result` is present once scoring has run — an
      // item's own `qti-choice-interaction` scope means it's always there
      // for this story's items, but the field is optional in the response
      // shape itself (submit alone, with no scoring story, still works).
      if (body.result) setResult({ totalScore: body.result.totalScore, maxScore: body.result.maxScore })
      setSubmitted(true)
    } else {
      setActionError('Could not submit. Try again.')
    }
  }

  const currentItem = items?.[index]

  // Question-taking (and the qti3-player it hosts) needs real width to
  // render answer text legibly — the other states here are a couple of
  // short status lines, which is what `max-w-sm text-center` was sized
  // for. Widening the card for every state keeps one layout instead of
  // branching the wrapper itself.
  const showingQuestion = joinState === 'joined' && status === 'running' && !submitted && currentItem

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-6">
      <Card className={showingQuestion ? 'w-full max-w-3xl' : 'max-w-sm text-center'}>
        <h1 className="mb-3 text-lg font-semibold text-ink">Quiz session</h1>
        {joinState === 'joining' && <p className="text-sm text-ink/70">Joining…</p>}
        {joinState === 'error' && <p className="text-sm text-error">Could not join this session. Ask your trainer for a new link.</p>}

        {joinState === 'joined' && status === 'closed' && (
          <p className="text-sm text-ink/70" data-testid="not-started-message">
            This quiz hasn&apos;t started yet. Check back once the trainer starts the session.
          </p>
        )}

        {joinState === 'joined' && status === 'stopped' && (
          <p className="text-sm text-ink/70" data-testid="stopped-message">
            This quiz session has ended.
          </p>
        )}

        {joinState === 'joined' && status === 'running' && submitted && (
          <div className="flex flex-col items-center gap-2" data-testid="submitted-confirmation">
            <p className="text-sm font-medium text-ink">✓ Quiz submitted!</p>
            {result && (
              <p className="text-sm text-ink" data-testid="quiz-score">
                Your score: {result.totalScore} / {result.maxScore}
              </p>
            )}
          </div>
        )}

        {showingQuestion && (
          <div className="flex flex-col items-stretch gap-group-gap text-left" data-testid="quiz-question">
            <p className="text-sm text-ink/70">
              Question {index + 1} of {items?.length}
            </p>
            {currentItem.supported ? (
              <div className="w-full">
                <QtiAssessmentItemPlayer key={currentItem.identifier} ref={playerRef} xml={currentItem.xml} />
              </div>
            ) : (
              <p className="text-sm text-ink/70" data-testid="unsupported-item-message">
                ⚠ This question type isn&apos;t supported yet and has been skipped.
              </p>
            )}
            {actionError && <p className="text-sm text-error">{actionError}</p>}
            <Button type="button" onClick={handleNext} className="self-start">
              {items && index === items.length - 1 ? 'Submit' : 'Next'}
            </Button>
          </div>
        )}
      </Card>
    </div>
  )
}

export default QuizSessionTakePage
