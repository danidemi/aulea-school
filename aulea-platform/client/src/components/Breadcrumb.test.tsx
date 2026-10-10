import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import Breadcrumb from './Breadcrumb'

// Covers BUG-BREADCRUMB-NAV's DoD (active_sprint/bug_breadcrumb_inconsistent_and_missing.md):
// one shared, route-driven breadcrumb, correct at every step of
// Courses -> course -> quiz's sessions -> a specific session.

function stubFetch(handlers: {
  course?: { title: string } | null
  quiz?: { title: string; courseId: string; courseTitle: string } | null
  session?: { quizId: string; startedAt: string | null } | null
}) {
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) => {
      if (url.startsWith('/api/courses/')) {
        return handlers.course
          ? Promise.resolve({ status: 200, json: () => Promise.resolve(handlers.course) })
          : Promise.resolve({ status: 404, json: () => Promise.resolve({}) })
      }
      if (url.startsWith('/api/quizzes/')) {
        return handlers.quiz
          ? Promise.resolve({ status: 200, json: () => Promise.resolve(handlers.quiz) })
          : Promise.resolve({ status: 404, json: () => Promise.resolve({}) })
      }
      if (url.startsWith('/api/quiz-sessions/')) {
        return handlers.session
          ? Promise.resolve({ status: 200, json: () => Promise.resolve(handlers.session) })
          : Promise.resolve({ status: 404, json: () => Promise.resolve({}) })
      }
      return Promise.resolve({ status: 404, json: () => Promise.resolve({}) })
    }),
  )
}

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/courses" element={<Breadcrumb />} />
        <Route path="/courses/:courseId" element={<Breadcrumb />} />
        <Route path="/quizzes/:quizId/sessions" element={<Breadcrumb />} />
        <Route path="/quiz-sessions/:sessionId" element={<Breadcrumb />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('Breadcrumb (BUG-BREADCRUMB-NAV)', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shows just "Courses" on /courses, with no placeholder segment', async () => {
    // given: no course/quiz/session data is relevant on this route
    stubFetch({})

    // when: rendered at /courses
    renderAt('/courses')

    // then: the breadcrumb is just "Courses", no "(no course selected)" placeholder
    await waitFor(() => expect(screen.getByRole('navigation', { name: /breadcrumb/i })).toHaveTextContent('Courses'))
    expect(screen.queryByText(/no course selected/i)).not.toBeInTheDocument()
  })

  it('shows "Courses > <course>" on a course detail page', async () => {
    // given: the route's course resolves
    stubFetch({ course: { title: 'Intro to Python' } })

    // when: rendered at /courses/:courseId
    renderAt('/courses/course-1')

    // then: the trail names the course
    await waitFor(() =>
      expect(screen.getByRole('navigation', { name: /breadcrumb/i })).toHaveTextContent('Courses > Intro to Python'),
    )
  })

  it('shows "Courses > <course> > <quiz>" on the sessions-list page (no session selected there)', async () => {
    // given: the route's quiz resolves to its course
    stubFetch({ quiz: { title: 'Chapter 1 quiz', courseId: 'course-1', courseTitle: 'Intro to Python' } })

    // when: rendered at /quizzes/:quizId/sessions
    renderAt('/quizzes/quiz-1/sessions')

    // then: the trail ends at the quiz — nothing is "selected" on this list page
    await waitFor(() =>
      expect(screen.getByRole('navigation', { name: /breadcrumb/i })).toHaveTextContent('Courses > Intro to Python > Chapter 1 quiz'),
    )
  })

  it('shows the full trail, including the session, on the session monitor page', async () => {
    // given: the route's session resolves to its quiz, which resolves to its course
    stubFetch({
      session: { quizId: 'quiz-1', startedAt: '2026-09-27T16:00:00Z' },
      quiz: { title: 'Chapter 1 quiz', courseId: 'course-1', courseTitle: 'Intro to Python' },
    })

    // when: rendered at /quiz-sessions/:sessionId
    renderAt('/quiz-sessions/session-1')

    // then: the trail includes the session, labeled by its start date/time
    await waitFor(() =>
      expect(screen.getByRole('navigation', { name: /breadcrumb/i })).toHaveTextContent(
        `Courses > Intro to Python > Chapter 1 quiz > ${new Date('2026-09-27T16:00:00Z').toLocaleString()}`,
      ),
    )
  })

  it('shows "Not started" for a session with no startedAt yet', async () => {
    // given: the session has never been started
    stubFetch({
      session: { quizId: 'quiz-1', startedAt: null },
      quiz: { title: 'Chapter 1 quiz', courseId: 'course-1', courseTitle: 'Intro to Python' },
    })

    // when: rendered at /quiz-sessions/:sessionId
    renderAt('/quiz-sessions/session-1')

    // then: the session segment falls back to "Not started"
    await waitFor(() => expect(screen.getByRole('navigation', { name: /breadcrumb/i })).toHaveTextContent('Not started'))
  })
})
