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

// Covers SESSION-DELETE-001's client DoD (active_sprint/delete-quiz-sessions.md).

describe('QuizSessionHistoryPage (SESSION-DELETE-001)', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  const SESSIONS = [
    { id: 'session-run', status: 'running', startedAt: '2026-09-20T10:00:00Z', stoppedAt: null, joinedCount: 1, submittedCount: 0 },
    { id: 'session-old', status: 'stopped', startedAt: '2026-09-19T10:00:00Z', stoppedAt: '2026-09-19T10:30:00Z', joinedCount: 3, submittedCount: 3 },
  ]

  function stubWithDelete(deleteHandler: (body: { sessionIds: string[]; dryRun?: boolean }) => { status: number; body: unknown }) {
    let sessions = [...SESSIONS]
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string, init?: { body?: string }) => {
        if (url === '/api/me') return Promise.resolve({ status: 200, json: () => Promise.resolve(SIGNED_IN_USER) })
        if (url === '/api/quizzes/quiz-1/sessions/delete') {
          const parsed = JSON.parse(init!.body!)
          const result = deleteHandler(parsed)
          if (result.status === 200 && !parsed.dryRun) sessions = sessions.filter((s) => !parsed.sessionIds.includes(s.id))
          return Promise.resolve({ status: result.status, json: () => Promise.resolve(result.body) })
        }
        if (url === '/api/quizzes/quiz-1/sessions') return Promise.resolve({ status: 200, json: () => Promise.resolve(sessions) })
        return Promise.resolve({ status: 404, json: () => Promise.resolve({}) })
      }),
    )
  }

  async function renderLoaded() {
    renderAt('quiz-1')
    await waitFor(() => expect(screen.getByText('running')).toBeInTheDocument())
  }

  it('disables "Delete selected" until a session is selected, and the running session cannot be selected', async () => {
    // given: a running and a stopped session
    stubWithDelete(() => ({ status: 200, body: { sessionCount: 1, answerCount: 0 } }))
    await renderLoaded()

    // then: nothing selected, the button is disabled, and the running checkbox is disabled
    expect(screen.getByRole('button', { name: /delete selected/i })).toBeDisabled()
    expect(screen.getByRole('checkbox', { name: /select session session-run/i })).toBeDisabled()

    // when: selecting the stopped session
    fireEvent.click(screen.getByRole('checkbox', { name: /select session session-old/i }))

    // then: the button is enabled
    expect(screen.getByRole('button', { name: /delete selected/i })).toBeEnabled()
  })

  it('shows the dry-run counts in a dialog, then deletes on confirm and refreshes the list', async () => {
    // given: the server reports 1 session and 5 answers for the dry run
    stubWithDelete(() => ({ status: 200, body: { sessionCount: 1, answerCount: 5 } }))
    await renderLoaded()
    fireEvent.click(screen.getByRole('checkbox', { name: /select session session-old/i }))

    // when: opening the dialog and confirming
    fireEvent.click(screen.getByRole('button', { name: /delete selected/i }))
    await waitFor(() => expect(screen.getByRole('dialog')).toHaveTextContent('1 session and 5 answers'))
    fireEvent.click(screen.getByRole('button', { name: /^delete$/i }))

    // then: a non-dry-run delete was sent and the stopped session disappears
    await waitFor(() => expect(screen.queryByText('stopped')).not.toBeInTheDocument())
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      '/api/quizzes/quiz-1/sessions/delete',
      expect.objectContaining({ body: JSON.stringify({ sessionIds: ['session-old'], dryRun: false }) }),
    )
  })

  it('cancelling the dialog deletes nothing', async () => {
    // given: an open dialog
    stubWithDelete(() => ({ status: 200, body: { sessionCount: 1, answerCount: 0 } }))
    await renderLoaded()
    fireEvent.click(screen.getByRole('checkbox', { name: /select session session-old/i }))
    fireEvent.click(screen.getByRole('button', { name: /delete selected/i }))
    await waitFor(() => expect(screen.getByRole('dialog')).toHaveTextContent('1 session and 0 answers'))

    // when: cancelling
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))

    // then: only the dry run was sent and the session is still listed
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    const deleteCalls = vi.mocked(fetch).mock.calls.filter(([url]) => url === '/api/quizzes/quiz-1/sessions/delete')
    expect(deleteCalls).toHaveLength(1)
    expect(screen.getByText('stopped')).toBeInTheDocument()
  })

  it('does not navigate to the monitor when a checkbox is clicked', async () => {
    // given: a row whose click would navigate
    stubWithDelete(() => ({ status: 200, body: { sessionCount: 1, answerCount: 0 } }))
    const assignSpy = vi.fn()
    vi.stubGlobal('location', { ...window.location, assign: assignSpy })
    await renderLoaded()

    // when: clicking the checkbox
    fireEvent.click(screen.getByRole('checkbox', { name: /select session session-old/i }))

    // then: no navigation
    expect(assignSpy).not.toHaveBeenCalled()
  })
})
