import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import CourseDetailPage from './CourseDetailPage'

// Covers COURSE-DETAIL-001's DoD (active_sprint/story_course_detail_page.md):
// breadcrumb reads "Courses > <selected course name>", the quizzes
// section is shown, and navigating from one course to another updates
// both correctly.

const SIGNED_IN_USER = { id: '1', email: 'trainer@example.com', tenant: { id: 't1', name: "trainer@example.com's workspace" } }

const COURSES: Record<string, { id: string; title: string }> = {
  'course-1': { id: 'course-1', title: 'Intro to Python' },
  'course-2': { id: 'course-2', title: 'Advanced SQL' },
}

function renderAt(courseId: string) {
  render(
    <MemoryRouter initialEntries={[`/courses/${courseId}`]}>
      <Routes>
        <Route path="/courses/:courseId" element={<CourseDetailPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

function stubFetch(handlers: { me?: object | null; courseStatus?: number }) {
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string, init?: RequestInit) => {
      if (url === '/api/me') {
        return handlers.me
          ? Promise.resolve({ status: 200, json: () => Promise.resolve(handlers.me) })
          : Promise.resolve({ status: 401, json: () => Promise.resolve({ error: 'not_signed_in' }) })
      }
      const courseMatch = url.match(/^\/api\/courses\/([^/]+)$/)
      if (courseMatch) {
        const course = COURSES[courseMatch[1]]
        if (handlers.courseStatus && handlers.courseStatus !== 200) {
          return Promise.resolve({ status: handlers.courseStatus, json: () => Promise.resolve({ error: 'course_not_found' }) })
        }
        return course
          ? Promise.resolve({ status: 200, json: () => Promise.resolve(course) })
          : Promise.resolve({ status: 404, json: () => Promise.resolve({ error: 'course_not_found' }) })
      }
      if (url.endsWith('/quizzes') && (!init || init.method === undefined)) {
        return Promise.resolve({ status: 200, json: () => Promise.resolve([]) })
      }
      return Promise.resolve({ status: 404, json: () => Promise.resolve({}) })
    }),
  )
}

describe('CourseDetailPage (COURSE-DETAIL-001)', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('prompts to sign in when not signed in', async () => {
    stubFetch({ me: null })
    renderAt('course-1')
    await waitFor(() => expect(screen.getByText(/to view this course/i)).toBeInTheDocument())
  })

  it('shows a breadcrumb naming the selected course', async () => {
    stubFetch({ me: SIGNED_IN_USER })
    renderAt('course-1')
    await waitFor(() => expect(screen.getByRole('navigation', { name: /breadcrumb/i })).toHaveTextContent('Courses > Intro to Python'))
  })

  it('shows the quizzes section for the selected course', async () => {
    stubFetch({ me: SIGNED_IN_USER })
    renderAt('course-1')
    await waitFor(() => expect(screen.getByText(/no quizzes uploaded/i)).toBeInTheDocument())
  })

  it('updates the breadcrumb and quizzes when navigating to a different course', async () => {
    stubFetch({ me: SIGNED_IN_USER })
    renderAt('course-1')
    await waitFor(() => expect(screen.getByRole('navigation', { name: /breadcrumb/i })).toHaveTextContent('Intro to Python'))

    renderAt('course-2')
    await waitFor(() => expect(screen.getAllByRole('navigation', { name: /breadcrumb/i })[1]).toHaveTextContent('Advanced SQL'))
  })

  it('shows an error when the course cannot be loaded', async () => {
    stubFetch({ me: SIGNED_IN_USER, courseStatus: 404 })
    renderAt('does-not-exist')
    await waitFor(() => expect(screen.getByText(/could not load this course/i)).toBeInTheDocument())
  })
})
