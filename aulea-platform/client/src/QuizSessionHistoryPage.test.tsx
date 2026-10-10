import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import QuizSessionHistoryPage from './QuizSessionHistoryPage'

// Covers QUIZ-SESSION-HISTORY-001's DoD
// (active_sprint/story_quiz_session_history.md): empty state, a populated
// list with the right per-row fields, and each row linking to the
// existing Quiz Session Monitor page.

const SIGNED_IN_USER = { id: '1', email: 'trainer@example.com', tenant: { id: 't1', name: "trainer@example.com's workspace" } }

function renderAt(quizId: string) {
  render(
    <MemoryRouter initialEntries={[`/quizzes/${quizId}/sessions`]}>
      <Routes>
        <Route path="/quizzes/:quizId/sessions" element={<QuizSessionHistoryPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

function stubFetch(handlers: { me?: object | null; sessionsStatus?: number; sessions?: unknown[] }) {
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) => {
      if (url === '/api/me') {
        return handlers.me
          ? Promise.resolve({ status: 200, json: () => Promise.resolve(handlers.me) })
          : Promise.resolve({ status: 401, json: () => Promise.resolve({ error: 'not_signed_in' }) })
      }
      if (url === '/api/quizzes/quiz-1/sessions') {
        return Promise.resolve({
          status: handlers.sessionsStatus ?? 200,
          json: () => Promise.resolve(handlers.sessions ?? []),
        })
      }
      return Promise.resolve({ status: 404, json: () => Promise.resolve({}) })
    }),
  )
}

describe('QuizSessionHistoryPage (QUIZ-SESSION-HISTORY-001)', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shows an empty state when the quiz has no sessions yet', async () => {
    stubFetch({ me: SIGNED_IN_USER, sessions: [] })
    renderAt('quiz-1')
    await waitFor(() => expect(screen.getByText(/no sessions yet for this quiz/i)).toBeInTheDocument())
  })

  it('shows a populated list with the right per-row fields', async () => {
    stubFetch({
      me: SIGNED_IN_USER,
      sessions: [
        {
          id: 'session-2',
          status: 'stopped',
          startedAt: '2026-09-20T10:00:00Z',
          stoppedAt: '2026-09-20T10:30:00Z',
          joinedCount: 12,
          submittedCount: 10,
        },
        {
          id: 'session-1',
          status: 'closed',
          startedAt: null,
          stoppedAt: null,
          joinedCount: 0,
          submittedCount: 0,
        },
      ],
    })
    renderAt('quiz-1')

    await waitFor(() => expect(screen.getByText('stopped')).toBeInTheDocument())
    expect(screen.getByText('closed')).toBeInTheDocument()
    expect(screen.getByText('12 / 10')).toBeInTheDocument()
    expect(screen.getByText('0 / 0')).toBeInTheDocument()
    expect(screen.getByText('not started yet')).toBeInTheDocument()
    expect(screen.getAllByText('—').length).toBeGreaterThan(0)
  })

  it('navigates to the session\'s Monitor page when a row is clicked', async () => {
    stubFetch({
      me: SIGNED_IN_USER,
      sessions: [{ id: 'session-2', status: 'stopped', startedAt: '2026-09-20T10:00:00Z', stoppedAt: '2026-09-20T10:30:00Z', joinedCount: 1, submittedCount: 1 }],
    })
    const assignSpy = vi.fn()
    vi.stubGlobal('location', { ...window.location, assign: assignSpy })

    renderAt('quiz-1')
    await waitFor(() => expect(screen.getByText('stopped')).toBeInTheDocument())

    fireEvent.click(screen.getByText('stopped'))

    expect(assignSpy).toHaveBeenCalledWith('/quiz-sessions/session-2')
  })

  it('shows a sign-in prompt when not signed in', async () => {
    stubFetch({ me: null })
    renderAt('quiz-1')
    await waitFor(() => expect(screen.getByText(/to view this quiz's sessions/i)).toBeInTheDocument())
  })

  it('shows a load error if the sessions cannot be fetched', async () => {
    stubFetch({ me: SIGNED_IN_USER, sessionsStatus: 404 })
    renderAt('quiz-1')
    await waitFor(() => expect(screen.getByText(/could not load the sessions/i)).toBeInTheDocument())
  })
})
