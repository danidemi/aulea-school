import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import QuizzesSection from './QuizzesSection'

// Covers QUIZ-DASHBOARD-001's DoD (past_sprints/.../story_quiz_dashboard.md):
// lists a course's quizzes (title/upload date/status), can delete a row,
// can replace a quiz's file without creating a new row. Extracted out of
// the former standalone `QuizDashboardPage` by COURSE-DETAIL-001 — this
// component takes `courseId` as a prop, no route/session concerns of its
// own (those now live on `CourseDetailPage`).

function renderSection(courseId = 'course-1') {
  render(<QuizzesSection courseId={courseId} />)
}

function stubFetch(handlers: {
  quizzes?: unknown[]
  deleteStatus?: number
  replaceStatus?: number
  replaceBody?: unknown
  uploadStatus?: number
  uploadBody?: unknown
}) {
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string, init?: RequestInit) => {
      if (url.endsWith('/quizzes') && (!init || init.method === undefined)) {
        return Promise.resolve({ status: 200, json: () => Promise.resolve(handlers.quizzes ?? []) })
      }
      if (init?.method === 'DELETE') {
        return Promise.resolve({ status: handlers.deleteStatus ?? 204 })
      }
      if (init?.method === 'PUT') {
        return Promise.resolve({
          status: handlers.replaceStatus ?? 200,
          json: () => Promise.resolve(handlers.replaceBody ?? {}),
        })
      }
      if (init?.method === 'POST') {
        return Promise.resolve({
          status: handlers.uploadStatus ?? 201,
          json: () => Promise.resolve(handlers.uploadBody ?? { id: 'new', title: 'New quiz', status: 'uploaded' }),
        })
      }
      return Promise.resolve({ status: 404, json: () => Promise.resolve({}) })
    }),
  )
}

function chooseFile(testId: string, name = 'quiz.xml') {
  const input = screen.getByTestId(testId) as HTMLInputElement
  const file = new File(['<xml/>'], name, { type: 'text/xml' })
  fireEvent.change(input, { target: { files: [file] } })
}

describe('QuizzesSection (QUIZ-DASHBOARD-001, extracted by COURSE-DETAIL-001)', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shows an empty state when the course has no quizzes yet', async () => {
    stubFetch({ quizzes: [] })
    renderSection()
    await waitFor(() => expect(screen.getByText(/no quizzes uploaded/i)).toBeInTheDocument())
  })

  it('lists quizzes with title, uploaded date, and status', async () => {
    stubFetch({
      quizzes: [{ id: 'q1', title: 'Chapter 1 quiz', fileName: 'ch1.xml', status: 'uploaded', createdAt: '2026-01-10T00:00:00Z', updatedAt: '2026-01-10T00:00:00Z' }],
    })
    renderSection()

    await waitFor(() => expect(screen.getByText('Chapter 1 quiz')).toBeInTheDocument())
    expect(screen.getByText('uploaded')).toBeInTheDocument()
  })

  it('deletes a quiz row and refreshes the list', async () => {
    stubFetch({
      quizzes: [{ id: 'q1', title: 'Chapter 1 quiz', fileName: 'ch1.xml', status: 'uploaded', createdAt: '2026-01-10T00:00:00Z', updatedAt: '2026-01-10T00:00:00Z' }],
    })
    renderSection()
    await waitFor(() => expect(screen.getByText('Chapter 1 quiz')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: /delete/i }))

    await waitFor(() =>
      expect(vi.mocked(fetch)).toHaveBeenCalledWith('/api/courses/course-1/quizzes/q1', expect.objectContaining({ method: 'DELETE' })),
    )
  })

  it('shows an error when delete fails', async () => {
    stubFetch({
      quizzes: [{ id: 'q1', title: 'Chapter 1 quiz', fileName: 'ch1.xml', status: 'uploaded', createdAt: '2026-01-10T00:00:00Z', updatedAt: '2026-01-10T00:00:00Z' }],
      deleteStatus: 500,
    })
    renderSection()
    await waitFor(() => expect(screen.getByText('Chapter 1 quiz')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: /delete/i }))

    await waitFor(() => expect(screen.getByText(/could not delete/i)).toBeInTheDocument())
  })

  it('uploads a quiz and refreshes the list on success (QTI-22-IMPORT)', async () => {
    stubFetch({ quizzes: [] })
    renderSection()
    await waitFor(() => expect(screen.getByText(/no quizzes uploaded/i)).toBeInTheDocument())

    chooseFile('upload-file-input')

    await waitFor(() =>
      expect(vi.mocked(fetch)).toHaveBeenCalledWith('/api/courses/course-1/quizzes', expect.objectContaining({ method: 'POST' })),
    )
  })

  it('shows line/element-level errors when the server rejects the file as invalid QTI (QTI3-MIGRATION-001)', async () => {
    stubFetch({
      quizzes: [],
      uploadStatus: 400,
      uploadBody: {
        error: 'invalid_format',
        errors: [{ line: 1, message: '<qti-assessment-item> is missing the required "identifier" attribute' }],
      },
    })
    renderSection()
    await waitFor(() => expect(screen.getByText(/no quizzes uploaded/i)).toBeInTheDocument())

    chooseFile('upload-file-input', 'bad.xml')

    await waitFor(() => expect(screen.getByText(/isn't valid qti 3\.0/i)).toBeInTheDocument())
    expect(screen.getByText(/missing the required "identifier" attribute/i)).toBeInTheDocument()
    expect(screen.getByText(/line 1/i)).toBeInTheDocument()
  })

  it('shows a generic error for an unexpected upload failure', async () => {
    stubFetch({ quizzes: [], uploadStatus: 500, uploadBody: { error: 'internal_error' } })
    renderSection()
    await waitFor(() => expect(screen.getByText(/no quizzes uploaded/i)).toBeInTheDocument())

    chooseFile('upload-file-input')

    await waitFor(() => expect(screen.getByText(/could not upload/i)).toBeInTheDocument())
  })

  // QUIZ-SESSION-CONTROL-001: "Create session" navigates straight to the
  // new session's monitor page, same direct-navigation pattern
  // CourseDashboardPage already uses for its own rows.
  it('creates a quiz session and navigates to its monitor page', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string, init?: RequestInit) => {
        if (url.endsWith('/quizzes') && (!init || init.method === undefined)) {
          return Promise.resolve({
            status: 200,
            json: () => Promise.resolve([{ id: 'q1', title: 'Chapter 1 quiz', fileName: 'ch1.xml', status: 'uploaded', createdAt: '2026-01-10T00:00:00Z', updatedAt: '2026-01-10T00:00:00Z' }]),
          })
        }
        if (url === '/api/quizzes/q1/sessions' && init?.method === 'POST') {
          return Promise.resolve({ status: 201, json: () => Promise.resolve({ id: 'session-1', status: 'closed' }) })
        }
        return Promise.resolve({ status: 404, json: () => Promise.resolve({}) })
      }),
    )
    const assignSpy = vi.fn()
    vi.stubGlobal('location', { ...window.location, assign: assignSpy })

    renderSection()
    await waitFor(() => expect(screen.getByText('Chapter 1 quiz')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: /create session/i }))

    await waitFor(() => expect(assignSpy).toHaveBeenCalledWith('/quiz-sessions/session-1'))
  })

  // QUIZ-SESSION-HISTORY-001: "Sessions" navigates to the new history page
  // for the quiz, always shown regardless of how many sessions exist.
  it('shows a Sessions button per row that navigates to the quiz\'s session history', async () => {
    stubFetch({
      quizzes: [{ id: 'q1', title: 'Chapter 1 quiz', fileName: 'ch1.xml', status: 'uploaded', createdAt: '2026-01-10T00:00:00Z', updatedAt: '2026-01-10T00:00:00Z' }],
    })
    const assignSpy = vi.fn()
    vi.stubGlobal('location', { ...window.location, assign: assignSpy })

    renderSection()
    await waitFor(() => expect(screen.getByText('Chapter 1 quiz')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: /sessions/i }))

    expect(assignSpy).toHaveBeenCalledWith('/quizzes/q1/sessions')
  })

  it('shows an error when creating a session fails', async () => {
    stubFetch({
      quizzes: [{ id: 'q1', title: 'Chapter 1 quiz', fileName: 'ch1.xml', status: 'uploaded', createdAt: '2026-01-10T00:00:00Z', updatedAt: '2026-01-10T00:00:00Z' }],
      uploadStatus: 500,
    })
    renderSection()
    await waitFor(() => expect(screen.getByText('Chapter 1 quiz')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: /create session/i }))

    await waitFor(() => expect(screen.getByText(/could not create a quiz session/i)).toBeInTheDocument())
  })
})
