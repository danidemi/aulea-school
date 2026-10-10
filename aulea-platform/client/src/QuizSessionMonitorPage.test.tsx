import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import QuizSessionMonitorPage from './QuizSessionMonitorPage'

// Covers QUIZ-SESSION-CONTROL-001's DoD
// (active_sprint/story_quiz_session_control.md): the Quiz Session Monitor
// page — QR + URL, Block #1's closed/running states and start/stop
// transitions. Also covers QUIZ-SESSION-LIVE-STATUS-001's DoD
// (active_sprint/story_quiz_session_live_status.md): Block #2's real
// joined/submitted counts in all three states.

const SIGNED_IN_USER = { id: '1', email: 'trainer@example.com', tenant: { id: 't1', name: "trainer@example.com's workspace" } }

function renderAt(sessionId: string) {
  render(
    <MemoryRouter initialEntries={[`/quiz-sessions/${sessionId}`]}>
      <Routes>
        <Route path="/quiz-sessions/:sessionId" element={<QuizSessionMonitorPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

function stubFetch(handlers: {
  me?: object | null
  session?: object | null
  sessionStatus?: number
  startStatus?: number
  stopStatus?: number
  results?: object | null
  answerBreakdown?: object | null
}) {
  let session = handlers.session
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string, init?: RequestInit) => {
      if (url === '/api/me') {
        return handlers.me
          ? Promise.resolve({ status: 200, json: () => Promise.resolve(handlers.me) })
          : Promise.resolve({ status: 401, json: () => Promise.resolve({ error: 'not_signed_in' }) })
      }
      if (url.endsWith('/start') && init?.method === 'POST') {
        if (handlers.startStatus && handlers.startStatus !== 200) {
          return Promise.resolve({ status: handlers.startStatus, json: () => Promise.resolve({ error: 'invalid_time_limit' }) })
        }
        session = { ...(session as object), status: 'running', closesAt: '2026-08-23T13:00:00Z' }
        return Promise.resolve({ status: 200, json: () => Promise.resolve(session) })
      }
      if (url.endsWith('/stop') && init?.method === 'POST') {
        if (handlers.stopStatus && handlers.stopStatus !== 200) {
          return Promise.resolve({ status: handlers.stopStatus, json: () => Promise.resolve({ error: 'internal_error' }) })
        }
        session = { ...(session as object), status: 'stopped' }
        return Promise.resolve({ status: 200, json: () => Promise.resolve(session) })
      }
      if (url.endsWith('/results')) {
        return handlers.results
          ? Promise.resolve({ status: 200, json: () => Promise.resolve(handlers.results) })
          : Promise.resolve({ status: 409, json: () => Promise.resolve({ error: 'results_not_available' }) })
      }
      if (url.endsWith('/answer-breakdown')) {
        return handlers.answerBreakdown
          ? Promise.resolve({ status: 200, json: () => Promise.resolve(handlers.answerBreakdown) })
          : Promise.resolve({ status: 409, json: () => Promise.resolve({ error: 'results_not_available' }) })
      }
      if (url.match(/^\/api\/quiz-sessions\/[^/]+$/)) {
        if (handlers.sessionStatus && handlers.sessionStatus !== 200) {
          return Promise.resolve({ status: handlers.sessionStatus, json: () => Promise.resolve({ error: 'session_not_found' }) })
        }
        return Promise.resolve({ status: 200, json: () => Promise.resolve(session) })
      }
      return Promise.resolve({ status: 404, json: () => Promise.resolve({}) })
    }),
  )
}

const BASE_SESSION = {
  id: 'session-1',
  quizId: 'q1',
  status: 'closed',
  timeLimitSeconds: null,
  startedAt: null,
  closesAt: null,
  stoppedAt: null,
  takeUrl: 'http://localhost:3000/quiz-sessions/session-1/take',
  joinedCount: 0,
  submittedCount: 0,
}

describe('QuizSessionMonitorPage (QUIZ-SESSION-CONTROL-001)', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('prompts to sign in when not signed in', async () => {
    stubFetch({ me: null })
    renderAt('session-1')
    await waitFor(() => expect(screen.getByText(/to view this session/i)).toBeInTheDocument())
  })

  it('shows the closed state with a time-limit input and Start button', async () => {
    stubFetch({ me: SIGNED_IN_USER, session: BASE_SESSION })
    renderAt('session-1')
    await waitFor(() => expect(screen.getByRole('button', { name: /start/i })).toBeInTheDocument())
    expect(screen.getByLabelText(/time limit/i)).toBeInTheDocument()
  })

  it('shows the take URL as a link and renders a QR code', async () => {
    stubFetch({ me: SIGNED_IN_USER, session: BASE_SESSION })
    renderAt('session-1')
    await waitFor(() => expect(screen.getByTestId('session-qr-code').innerHTML).toContain('<svg'))
  })

  it('makes the take URL a clickable link that opens in a new tab (QUIZ-TAKE-URL-LINK-001)', async () => {
    stubFetch({ me: SIGNED_IN_USER, session: BASE_SESSION })
    renderAt('session-1')
    const link = await screen.findByRole('link', { name: new RegExp(BASE_SESSION.takeUrl) })
    expect(link).toHaveAttribute('href', BASE_SESSION.takeUrl)
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    expect(link.querySelector('svg')).toBeInTheDocument()
  })

  it('starts the session and shows the running state with a Stop button', async () => {
    stubFetch({ me: SIGNED_IN_USER, session: { ...BASE_SESSION } })
    renderAt('session-1')
    await waitFor(() => expect(screen.getByRole('button', { name: /start/i })).toBeInTheDocument())

    fireEvent.change(screen.getByLabelText(/time limit/i), { target: { value: '75m' } })
    fireEvent.click(screen.getByRole('button', { name: /start/i }))

    await waitFor(() => expect(screen.getByRole('button', { name: /stop/i })).toBeInTheDocument())
    expect(screen.getByText(/remaining/i)).toBeInTheDocument()
  })

  it('defaults both force-shuffle toggles off and sends them as false when starting without touching them (QUIZ-RANDOM-QUESTION-ORDER-001/QUIZ-RANDOM-ANSWER-ORDER-001)', async () => {
    // given: a closed session and a fetch spy to inspect the /start body
    stubFetch({ me: SIGNED_IN_USER, session: { ...BASE_SESSION } })
    renderAt('session-1')
    await waitFor(() => expect(screen.getByRole('button', { name: /start/i })).toBeInTheDocument())

    // then: both checkboxes render unchecked by default
    expect(screen.getByLabelText(/force shuffle questions/i)).not.toBeChecked()
    expect(screen.getByLabelText(/force shuffle answers/i)).not.toBeChecked()

    // when: starting without touching either toggle
    fireEvent.click(screen.getByRole('button', { name: /start/i }))

    // then: /start's body carries both flags, explicitly false
    await waitFor(() => expect(screen.getByRole('button', { name: /stop/i })).toBeInTheDocument())
    const startCall = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls.find((call) => (call[0] as string).endsWith('/start') && (call[1] as RequestInit | undefined)?.method === 'POST')
    const body = JSON.parse(startCall![1].body as string)
    expect(body.forceShuffleQuestions).toBe(false)
    expect(body.forceShuffleAnswers).toBe(false)
  })

  it('sends the force-shuffle toggles as true when the trainer turns them on', async () => {
    stubFetch({ me: SIGNED_IN_USER, session: { ...BASE_SESSION } })
    renderAt('session-1')
    await waitFor(() => expect(screen.getByRole('button', { name: /start/i })).toBeInTheDocument())

    fireEvent.click(screen.getByLabelText(/force shuffle questions/i))
    fireEvent.click(screen.getByLabelText(/force shuffle answers/i))
    expect(screen.getByLabelText(/force shuffle questions/i)).toBeChecked()
    expect(screen.getByLabelText(/force shuffle answers/i)).toBeChecked()

    fireEvent.click(screen.getByRole('button', { name: /start/i }))

    await waitFor(() => expect(screen.getByRole('button', { name: /stop/i })).toBeInTheDocument())
    const startCall = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls.find((call) => (call[0] as string).endsWith('/start') && (call[1] as RequestInit | undefined)?.method === 'POST')
    const body = JSON.parse(startCall![1].body as string)
    expect(body.forceShuffleQuestions).toBe(true)
    expect(body.forceShuffleAnswers).toBe(true)
  })

  it('shows an error and stays closed when starting fails', async () => {
    stubFetch({ me: SIGNED_IN_USER, session: { ...BASE_SESSION }, startStatus: 400 })
    renderAt('session-1')
    await waitFor(() => expect(screen.getByRole('button', { name: /start/i })).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: /start/i }))

    await waitFor(() => expect(screen.getByText(/could not start the session/i)).toBeInTheDocument())
    expect(screen.getByRole('button', { name: /start/i })).toBeInTheDocument()
  })

  it('stops a running session', async () => {
    stubFetch({ me: SIGNED_IN_USER, session: { ...BASE_SESSION, status: 'running', closesAt: '2026-08-23T13:00:00Z' } })
    renderAt('session-1')
    await waitFor(() => expect(screen.getByRole('button', { name: /stop/i })).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: /stop/i }))

    await waitFor(() => expect(screen.getByText(/session ended/i)).toBeInTheDocument())
  })

  // Caught by manual click-through against a real running instance
  // (2026-08-23): the first implementation left a stopped session with no
  // way back in from the UI (Block #1 rendered only a disabled Stop
  // button), contradicting the DoD's "always reopenable". This is the
  // regression test for that fix.
  it('offers a Reopen (start) action after stopping, not a dead end', async () => {
    stubFetch({ me: SIGNED_IN_USER, session: { ...BASE_SESSION, status: 'running', closesAt: '2026-08-23T13:00:00Z' } })
    renderAt('session-1')
    await waitFor(() => expect(screen.getByRole('button', { name: /stop/i })).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: /stop/i }))

    await waitFor(() => expect(screen.getByRole('button', { name: /reopen/i })).toBeInTheDocument())
    expect(screen.getByLabelText(/time limit/i)).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText(/time limit/i), { target: { value: '30m' } })
    fireEvent.click(screen.getByRole('button', { name: /reopen/i }))

    await waitFor(() => expect(screen.getByRole('button', { name: /stop/i })).toBeInTheDocument())
  })

  it('shows the joined count before start (QUIZ-SESSION-LIVE-STATUS-001)', async () => {
    stubFetch({ me: SIGNED_IN_USER, session: { ...BASE_SESSION, joinedCount: 3 } })
    renderAt('session-1')
    await waitFor(() => expect(screen.getByTestId('block-2-live-status')).toHaveTextContent(/quiz not yet started.*3 joined/i))
  })

  it('shows the answers progress while running (QUIZ-SESSION-LIVE-STATUS-001)', async () => {
    stubFetch({ me: SIGNED_IN_USER, session: { ...BASE_SESSION, status: 'running', startedAt: '2026-08-23T12:00:00Z', closesAt: '2026-08-23T13:00:00Z', joinedCount: 4, submittedCount: 2 } })
    renderAt('session-1')
    await waitFor(() => expect(screen.getByTestId('block-2-live-status')).toHaveTextContent('2/4 answered'))
    expect(screen.getAllByRole('progressbar')).toHaveLength(2)
  })

  it('shows the submission tally, not an answered percentage, after stop (revised at sprint planning)', async () => {
    stubFetch({ me: SIGNED_IN_USER, session: { ...BASE_SESSION, status: 'stopped', joinedCount: 10, submittedCount: 7 } })
    renderAt('session-1')
    await waitFor(() => expect(screen.getByTestId('block-2-live-status')).toHaveTextContent('7/10 submitted'))
  })

  it('polls for updated counts while closed (not just while running)', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const fetchMock = vi.fn((url: string) => {
      if (url === '/api/me') return Promise.resolve({ status: 200, json: () => Promise.resolve(SIGNED_IN_USER) })
      return Promise.resolve({ status: 200, json: () => Promise.resolve(BASE_SESSION) })
    })
    vi.stubGlobal('fetch', fetchMock)
    renderAt('session-1')
    await vi.waitFor(() => expect(screen.getByTestId('block-2-live-status')).toBeInTheDocument())

    const callsAfterLoad = fetchMock.mock.calls.length
    await vi.advanceTimersByTimeAsync(10000)
    expect(fetchMock.mock.calls.length).toBeGreaterThan(callsAfterLoad)
    vi.useRealTimers()
  })

  it('stops polling once the session is stopped', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const fetchMock = vi.fn((url: string) => {
      if (url === '/api/me') return Promise.resolve({ status: 200, json: () => Promise.resolve(SIGNED_IN_USER) })
      return Promise.resolve({ status: 200, json: () => Promise.resolve({ ...BASE_SESSION, status: 'stopped' }) })
    })
    vi.stubGlobal('fetch', fetchMock)
    renderAt('session-1')
    await vi.waitFor(() => expect(screen.getByTestId('block-2-live-status')).toBeInTheDocument())

    const callsAfterLoad = fetchMock.mock.calls.length
    await vi.advanceTimersByTimeAsync(10000)
    // already stopped on the very first load, so no interval should have
    // been started at all
    expect(fetchMock.mock.calls.length).toBe(callsAfterLoad)
    vi.useRealTimers()
  })

  it('shows Block #3 results once stopped (QUIZ-AUTO-EVAL-001)', async () => {
    stubFetch({
      me: SIGNED_IN_USER,
      session: { ...BASE_SESSION, status: 'stopped', joinedCount: 2, submittedCount: 2 },
      results: {
        connections: [
          { connectionId: 'conn-a', totalScore: 8, maxScore: 10, hasUngraded: false },
          { connectionId: 'conn-b', totalScore: 0, maxScore: 0, hasUngraded: true },
        ],
        classAverage: 0.8,
      },
    })
    renderAt('session-1')

    await waitFor(() => expect(screen.getByTestId('block-3-results')).toBeInTheDocument())
    expect(screen.getByTestId('block-3-results')).toHaveTextContent('Class average: 80%')
    expect(screen.getByTestId('block-3-results')).toHaveTextContent('8 / 10')
    expect(screen.getByTestId('block-3-results')).toHaveTextContent('needs manual grading')
  })

  it('shows a genuine zero-answer submission as a real score, not "needs manual grading" (QUIZ-CONNECTION-INTEGRITY-001)', async () => {
    stubFetch({
      me: SIGNED_IN_USER,
      session: { ...BASE_SESSION, status: 'stopped', joinedCount: 1, submittedCount: 1 },
      results: {
        connections: [{ connectionId: 'conn-a', totalScore: 0, maxScore: 0, hasUngraded: false }],
        classAverage: null,
      },
    })
    renderAt('session-1')

    await waitFor(() => expect(screen.getByTestId('block-3-results')).toBeInTheDocument())
    expect(screen.getByTestId('block-3-results')).toHaveTextContent('0 / 0')
    expect(screen.getByTestId('block-3-results')).not.toHaveTextContent('needs manual grading')
  })

  it('shows Block #4 answer breakdown once stopped, marking the correct option and a no-answer row (QUIZ-CLASS-REVIEW-001)', async () => {
    stubFetch({
      me: SIGNED_IN_USER,
      session: { ...BASE_SESSION, status: 'stopped', joinedCount: 3, submittedCount: 3 },
      results: { connections: [], classAverage: null },
      answerBreakdown: {
        items: [
          {
            itemIdentifier: 'single-choice-basic',
            prompt: 'Capital of France?',
            buckets: [
              { label: 'Berlin', count: 1, isCorrect: false },
              { label: 'Paris', count: 1, isCorrect: true },
            ],
            noAnswerCount: 1,
            respondentCount: 2,
          },
        ],
      },
    })
    renderAt('session-1')

    const block = await screen.findByTestId('block-4-answer-breakdown')
    expect(block).toHaveTextContent('Capital of France?')
    expect(block).toHaveTextContent('Berlin')
    expect(block).toHaveTextContent('Paris')
    expect(block).toHaveTextContent('No answer')
    expect(screen.getByLabelText('correct answer')).toBeInTheDocument()
  })

  it('renders a multi-question breakdown, one section per item', async () => {
    stubFetch({
      me: SIGNED_IN_USER,
      session: { ...BASE_SESSION, status: 'stopped', joinedCount: 2, submittedCount: 2 },
      results: { connections: [], classAverage: null },
      answerBreakdown: {
        items: [
          { itemIdentifier: 'item-1', prompt: 'Question 1', buckets: [{ label: 'A', count: 2, isCorrect: true }], noAnswerCount: 0, respondentCount: 2 },
          {
            itemIdentifier: 'item-2',
            prompt: 'Question 2',
            buckets: [
              { label: 'Rome', count: 1, isCorrect: true },
              { label: 'Milan', count: 1, isCorrect: false },
            ],
            noAnswerCount: 0,
            respondentCount: 2,
          },
        ],
      },
    })
    renderAt('session-1')

    await waitFor(() => expect(screen.getByTestId('item-breakdown-item-1')).toBeInTheDocument())
    expect(screen.getByTestId('item-breakdown-item-2')).toBeInTheDocument()
    expect(screen.getByTestId('item-breakdown-item-1')).toHaveTextContent('Question 1')
    expect(screen.getByTestId('item-breakdown-item-2')).toHaveTextContent('Question 2')
  })

  it('shows real per-option counts for a multi-select item and left-aligns every row — including No answer — regardless of correctness (BUG-ANSWER-BREAKDOWN-MULTISELECT, BUG-ANSWER-BREAKDOWN-BAR-MISALIGN)', async () => {
    stubFetch({
      me: SIGNED_IN_USER,
      session: { ...BASE_SESSION, status: 'stopped', joinedCount: 4, submittedCount: 4 },
      results: { connections: [], classAverage: null },
      answerBreakdown: {
        items: [
          {
            itemIdentifier: 'multi-select-primes',
            prompt: 'Which of the following are prime?',
            buckets: [
              { label: '2', count: 3, isCorrect: true },
              { label: '4', count: 1, isCorrect: false },
              { label: '7', count: 2, isCorrect: true },
              { label: '9', count: 0, isCorrect: false },
            ],
            noAnswerCount: 1,
            respondentCount: 4,
          },
        ],
      },
    })
    renderAt('session-1')

    const block = await screen.findByTestId('block-4-answer-breakdown')
    // real per-option counts show, not zero — asserted on the count span, not the option label
    const countSpans = Array.from(block.querySelectorAll('ul > li span.w-6')).map((span) => span.textContent)
    expect(countSpans).toEqual(['3', '1', '2', '0', '1'])
    expect(block).toHaveTextContent('No answer')

    // every row's first column (checkmark or its empty placeholder, on
    // every option row AND the No answer row) has the same fixed width
    const rows = block.querySelectorAll('ul > li')
    expect(rows).toHaveLength(5)
    const firstChildWidths = new Set(Array.from(rows).map((row) => (row.firstElementChild as HTMLElement).className))
    expect(firstChildWidths.size).toBe(1)
  })

  it('does not show Block #4 before the session is stopped', async () => {
    stubFetch({ me: SIGNED_IN_USER, session: { ...BASE_SESSION, status: 'running', closesAt: '2026-08-23T13:00:00Z' } })
    renderAt('session-1')
    await waitFor(() => expect(screen.getByTestId('block-2-live-status')).toBeInTheDocument())
    expect(screen.queryByTestId('block-4-answer-breakdown')).not.toBeInTheDocument()
  })

  it('does not show Block #3 before the session is stopped', async () => {
    stubFetch({ me: SIGNED_IN_USER, session: { ...BASE_SESSION, status: 'running', closesAt: '2026-08-23T13:00:00Z' } })
    renderAt('session-1')
    await waitFor(() => expect(screen.getByTestId('block-2-live-status')).toBeInTheDocument())
    expect(screen.queryByTestId('block-3-results')).not.toBeInTheDocument()
  })

  it('shows an error when the session cannot be loaded', async () => {
    stubFetch({ me: SIGNED_IN_USER, sessionStatus: 404 })
    renderAt('does-not-exist')
    await waitFor(() => expect(screen.getByText(/could not load this session/i)).toBeInTheDocument())
  })
})
