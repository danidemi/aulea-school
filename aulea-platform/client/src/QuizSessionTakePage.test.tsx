import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import QuizSessionTakePage from './QuizSessionTakePage'

// Covers the non-rendering slice of QUIZ-TAKE-RENDER-001's DoD
// (active_sprint/story_quiz_take_render.md): joining, the session-status
// gate (not-started/running/stopped), and the unsupported-interaction-type
// placeholder (which needs no qti3 web component to render). The actual
// qti3-player rendering/Next/Submit-sequencing path is verified by
// Playwright e2e instead (`client/e2e/quiz-session-take.spec.ts`) — jsdom
// compatibility for that Custom Element is unverified, per ADR-0011's
// Consequences and the spike's §4 finding.

function renderAt(sessionId: string) {
  render(
    <MemoryRouter initialEntries={[`/quiz-sessions/${sessionId}/take`]}>
      <Routes>
        <Route path="/quiz-sessions/:sessionId/take" element={<QuizSessionTakePage />} />
      </Routes>
    </MemoryRouter>,
  )
}

interface FetchHandlers {
  joinStatus?: number
  joinBody?: unknown
  statusStatus?: number
  statusBody?: unknown
  itemsStatus?: number
  itemsBody?: unknown
  submitStatus?: number
  submitBody?: unknown
}

function stubFetch(handlers: FetchHandlers) {
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string, init?: RequestInit) => {
      if (url.endsWith('/connections') && init?.method === 'POST') {
        return Promise.resolve({
          status: handlers.joinStatus ?? 201,
          json: () => Promise.resolve(handlers.joinBody ?? { id: 'connection-1' }),
        })
      }
      if (url.endsWith('/status')) {
        return Promise.resolve({
          status: handlers.statusStatus ?? 200,
          json: () => Promise.resolve(handlers.statusBody ?? { status: 'closed' }),
        })
      }
      if (url.endsWith('/items')) {
        return Promise.resolve({
          status: handlers.itemsStatus ?? 200,
          json: () => Promise.resolve(handlers.itemsBody ?? { items: [] }),
        })
      }
      if (url.endsWith('/submit') && init?.method === 'POST') {
        return Promise.resolve({ status: handlers.submitStatus ?? 200, json: () => Promise.resolve(handlers.submitBody ?? { ok: true }) })
      }
      if (url.endsWith('/answers') && init?.method === 'POST') {
        return Promise.resolve({ status: 201, json: () => Promise.resolve({ id: 'answer-1' }) })
      }
      return Promise.resolve({ status: 404, json: () => Promise.resolve({}) })
    }),
  )
}

describe('QuizSessionTakePage (QUIZ-TAKE-RENDER-001)', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('joins the session on load, with no sign-in of any kind', async () => {
    stubFetch({})
    renderAt('session-1')

    await waitFor(() => expect(screen.getByTestId('not-started-message')).toBeInTheDocument())
    expect(vi.mocked(fetch)).toHaveBeenCalledWith('/api/quiz-sessions/session-1/connections', expect.objectContaining({ method: 'POST' }))
    expect(vi.mocked(fetch)).not.toHaveBeenCalledWith('/api/me')
  })

  it('stores the connectionId on first join, so a later mount can reuse it (BUG-QUIZ-REFRESH-DUP-SESSION)', async () => {
    stubFetch({ joinBody: { id: 'connection-abc' } })
    renderAt('session-1')

    await waitFor(() => expect(screen.getByTestId('not-started-message')).toBeInTheDocument())
    expect(localStorage.getItem('quiz-session-connection:session-1')).toBe('connection-abc')
  })

  it('reuses a stored connectionId on mount instead of joining again (BUG-QUIZ-REFRESH-DUP-SESSION)', async () => {
    localStorage.setItem('quiz-session-connection:session-1', 'connection-abc')
    stubFetch({})
    renderAt('session-1')

    await waitFor(() => expect(screen.getByTestId('not-started-message')).toBeInTheDocument())
    expect(vi.mocked(fetch)).not.toHaveBeenCalledWith('/api/quiz-sessions/session-1/connections', expect.objectContaining({ method: 'POST' }))
  })

  it('shows an error when the session cannot be joined', async () => {
    stubFetch({ joinStatus: 404 })
    renderAt('does-not-exist')
    await waitFor(() => expect(screen.getByText(/could not join this session/i)).toBeInTheDocument())
  })

  it('shows a not-started message while the session is closed', async () => {
    stubFetch({ statusBody: { status: 'closed' } })
    renderAt('session-1')
    await waitFor(() => expect(screen.getByTestId('not-started-message')).toBeInTheDocument())
  })

  it("fetches this connection's own items from the connection-scoped endpoint (QUIZ-SESSION-PER-STUDENT-DELIVERY-001), for a freshly-joined connection", async () => {
    stubFetch({ joinBody: { id: 'connection-abc' }, statusBody: { status: 'running' }, itemsBody: { items: [] } })
    renderAt('session-1')

    await waitFor(() => expect(vi.mocked(fetch)).toHaveBeenCalledWith('/api/quiz-sessions/session-1/connections/connection-abc/items'))
  })

  it("fetches this connection's own items from the connection-scoped endpoint for a connection reused from localStorage", async () => {
    localStorage.setItem('quiz-session-connection:session-1', 'connection-stored')
    stubFetch({ statusBody: { status: 'running' }, itemsBody: { items: [] } })
    renderAt('session-1')

    await waitFor(() => expect(vi.mocked(fetch)).toHaveBeenCalledWith('/api/quiz-sessions/session-1/connections/connection-stored/items'))
  })

  it('shows a stopped message once the session has ended', async () => {
    stubFetch({ statusBody: { status: 'stopped' } })
    renderAt('session-1')
    await waitFor(() => expect(screen.getByTestId('stopped-message')).toBeInTheDocument())
  })

  it('shows the stopped message, not a join error, when the join is rejected because the session ended (QUIZ-CONNECTION-INTEGRITY-001)', async () => {
    stubFetch({ joinStatus: 409, joinBody: { error: 'session_not_running', status: 'stopped' } })
    renderAt('session-1')
    await waitFor(() => expect(screen.getByTestId('stopped-message')).toBeInTheDocument())
    expect(screen.queryByText(/could not join this session/i)).not.toBeInTheDocument()
  })

  it('renders the unsupported-interaction-type placeholder, and still advances via Next', async () => {
    stubFetch({
      statusBody: { status: 'running' },
      itemsBody: { items: [{ identifier: 'text-entry-unsupported', path: 'item.xml', xml: '<x/>', supported: false }] },
    })
    renderAt('session-1')

    await waitFor(() => expect(screen.getByTestId('unsupported-item-message')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /submit/i }))

    await waitFor(() => expect(screen.getByTestId('submitted-confirmation')).toBeInTheDocument())
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      '/api/quiz-sessions/session-1/connections/connection-1/answers',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ itemPath: 'item.xml', responses: null }) }),
    )
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      '/api/quiz-sessions/session-1/connections/connection-1/submit',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('shows the score line once QUIZ-AUTO-EVAL-001 scoring is present in the submit response', async () => {
    stubFetch({
      statusBody: { status: 'running' },
      itemsBody: { items: [{ identifier: 'text-entry-unsupported', path: 'item.xml', xml: '<x/>', supported: false }] },
      submitBody: { ok: true, result: { totalScore: 7, maxScore: 10, itemResults: [] } },
    })
    renderAt('session-1')
    await waitFor(() => expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: /submit/i }))

    await waitFor(() => expect(screen.getByTestId('quiz-score')).toHaveTextContent('Your score: 7 / 10'))
  })

  it('shows an error when submit fails', async () => {
    stubFetch({
      statusBody: { status: 'running' },
      itemsBody: { items: [{ identifier: 'text-entry-unsupported', path: 'item.xml', xml: '<x/>', supported: false }] },
      submitStatus: 500,
    })
    renderAt('session-1')
    await waitFor(() => expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: /submit/i }))

    await waitFor(() => expect(screen.getByText(/could not submit/i)).toBeInTheDocument())
  })
})
