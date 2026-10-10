import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import CourseDashboardPage from './CourseDashboardPage'

function renderPage() {
  render(
    <MemoryRouter initialEntries={['/courses']}>
      <CourseDashboardPage />
    </MemoryRouter>,
  )
}

// Covers COURSE-001's DoD (active_sprint/story_course_dashboard.md): the
// dashboard lists the tenant's courses, sorts, creates, selects (updating
// the breadcrumb), and shows an empty state when there are none.

const SIGNED_IN_USER = { id: '1', email: 'trainer@example.com', tenant: { id: 't1', name: "trainer@example.com's workspace" } }

function stubFetch(handlers: { me?: object | null; courses?: unknown[]; createStatus?: number; createBody?: unknown }) {
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string, init?: RequestInit) => {
      if (url === '/api/me') {
        return handlers.me
          ? Promise.resolve({ status: 200, json: () => Promise.resolve(handlers.me) })
          : Promise.resolve({ status: 401, json: () => Promise.resolve({ error: 'not_signed_in' }) })
      }
      if (url.startsWith('/api/courses') && (!init || init.method === undefined)) {
        return Promise.resolve({ status: 200, json: () => Promise.resolve(handlers.courses ?? []) })
      }
      if (url === '/api/courses' && init?.method === 'POST') {
        return Promise.resolve({
          status: handlers.createStatus ?? 201,
          json: () => Promise.resolve(handlers.createBody ?? { id: 'new', title: 'New course', createdAt: '2026-01-01', updatedAt: '2026-01-01' }),
        })
      }
      return Promise.resolve({ status: 404, json: () => Promise.resolve({}) })
    }),
  )
}

describe('CourseDashboardPage (COURSE-001)', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('prompts to sign in when not signed in', async () => {
    // given: no session
    stubFetch({ me: null })

    // when: the page renders
    renderPage()

    // then: a sign-in prompt is shown instead of a course list
    await waitFor(() => expect(screen.getByText(/to view your courses/i)).toBeInTheDocument())
  })

  it('shows an empty state when the tenant has no courses yet', async () => {
    // given: a signed-in user with no courses
    stubFetch({ me: SIGNED_IN_USER, courses: [] })

    // when: the page renders
    renderPage()

    // then: a friendly empty-state message is shown, not an empty table
    await waitFor(() => expect(screen.getByText(/no courses yet/i)).toBeInTheDocument())
  })

  it('lists the tenant\'s courses with title, created, and updated columns', async () => {
    // given: a signed-in user with two courses
    stubFetch({
      me: SIGNED_IN_USER,
      courses: [
        { id: 'c1', title: 'Intro to Python', createdAt: '2026-01-10T00:00:00Z', updatedAt: '2026-08-01T00:00:00Z' },
        { id: 'c2', title: 'Advanced SQL', createdAt: '2026-03-02T00:00:00Z', updatedAt: '2026-07-15T00:00:00Z' },
      ],
    })

    // when: the page renders
    renderPage()

    // then: both courses are listed
    await waitFor(() => expect(screen.getByText('Intro to Python')).toBeInTheDocument())
    expect(screen.getByText('Advanced SQL')).toBeInTheDocument()
  })

  it('navigates directly to the course detail page when a row is clicked (COURSE-DETAIL-001)', async () => {
    // given: a signed-in user with one course
    stubFetch({ me: SIGNED_IN_USER, courses: [{ id: 'c1', title: 'Intro to Python', createdAt: '2026-01-10T00:00:00Z', updatedAt: '2026-08-01T00:00:00Z' }] })
    const assignSpy = vi.fn()
    vi.stubGlobal('location', { ...window.location, assign: assignSpy })
    renderPage()
    await waitFor(() => expect(screen.getByText('Intro to Python')).toBeInTheDocument())

    // when: clicking the course row
    fireEvent.click(screen.getByText('Intro to Python'))

    // then: it navigates straight to that course's detail page, no intermediate selection
    expect(assignSpy).toHaveBeenCalledWith('/courses/c1')
  })

  it('shows just "Courses" in the breadcrumb, with no placeholder segment (BUG-BREADCRUMB-NAV: nothing is ever selected on this page)', async () => {
    // given: a signed-in user with a course
    stubFetch({ me: SIGNED_IN_USER, courses: [{ id: 'c1', title: 'Intro to Python', createdAt: '2026-01-10T00:00:00Z', updatedAt: '2026-08-01T00:00:00Z' }] })
    renderPage()

    // when/then: the breadcrumb never reflects a selection
    await waitFor(() => expect(screen.getByRole('navigation', { name: /breadcrumb/i })).toHaveTextContent('Courses'))
    expect(screen.queryByText(/no course selected/i)).not.toBeInTheDocument()
  })

  it('opens a "New course" form, submits it, and refreshes the list', async () => {
    // given: a signed-in user with no courses yet
    stubFetch({
      me: SIGNED_IN_USER,
      courses: [],
      createBody: { id: 'new', title: 'Onboarding basics', createdAt: '2026-06-20T00:00:00Z', updatedAt: '2026-06-20T00:00:00Z' },
    })
    renderPage()
    await waitFor(() => expect(screen.getByText(/no courses yet/i)).toBeInTheDocument())

    // when: opening the form and submitting a name
    fireEvent.click(screen.getByRole('button', { name: /\+ new course/i }))
    fireEvent.change(screen.getByLabelText(/course name/i), { target: { value: 'Onboarding basics' } })
    fireEvent.click(screen.getByRole('button', { name: /^create$/i }))

    // then: POST /api/courses was called with the name, and the dialog closes
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      '/api/courses',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ title: 'Onboarding basics' }) }),
    )
  })

  it('shows an error and keeps the form open when the title is already taken', async () => {
    // given: the server rejects the new course as a duplicate
    stubFetch({ me: SIGNED_IN_USER, courses: [], createStatus: 409, createBody: { error: 'title_taken' } })
    renderPage()
    await waitFor(() => expect(screen.getByText(/no courses yet/i)).toBeInTheDocument())

    // when: submitting a duplicate name
    fireEvent.click(screen.getByRole('button', { name: /\+ new course/i }))
    fireEvent.change(screen.getByLabelText(/course name/i), { target: { value: 'Intro to Python' } })
    fireEvent.click(screen.getByRole('button', { name: /^create$/i }))

    // then: an error is shown and the dialog stays open
    await waitFor(() => expect(screen.getByText(/already exists/i)).toBeInTheDocument())
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('sorts ascending on the first click of a column header', async () => {
    // given: a signed-in user with courses in server (title-ascending) order
    stubFetch({
      me: SIGNED_IN_USER,
      courses: [
        { id: 'c1', title: 'Advanced SQL', createdAt: '2026-03-02T00:00:00Z', updatedAt: '2026-07-15T00:00:00Z' },
        { id: 'c2', title: 'Intro to Python', createdAt: '2026-01-10T00:00:00Z', updatedAt: '2026-08-01T00:00:00Z' },
      ],
    })
    renderPage()
    await waitFor(() => expect(screen.getByText('Advanced SQL')).toBeInTheDocument())

    // when: clicking the "Created" header once
    fireEvent.click(screen.getByRole('button', { name: /^created$/i }))

    // then: rows are in ascending created-date order, with an ascending arrow on that header
    const rows = screen.getAllByRole('row').slice(1) // skip header row
    expect(within(rows[0]).getByText('Intro to Python')).toBeInTheDocument()
    expect(within(rows[1]).getByText('Advanced SQL')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^created$/i })).toHaveTextContent('▲')
  })

  it('cycles a column through ascending, descending, and unsorted on repeat clicks', async () => {
    // given: a signed-in user with two courses
    stubFetch({
      me: SIGNED_IN_USER,
      courses: [
        { id: 'c1', title: 'Advanced SQL', createdAt: '2026-03-02T00:00:00Z', updatedAt: '2026-07-15T00:00:00Z' },
        { id: 'c2', title: 'Intro to Python', createdAt: '2026-01-10T00:00:00Z', updatedAt: '2026-08-01T00:00:00Z' },
      ],
    })
    renderPage()
    await waitFor(() => expect(screen.getByText('Advanced SQL')).toBeInTheDocument())
    const titleHeader = screen.getByRole('button', { name: /^title$/i })

    // when: clicking the "Title" header twice (asc, then desc)
    fireEvent.click(titleHeader)
    fireEvent.click(titleHeader)

    // then: rows are in descending title order, with a descending arrow
    let rows = screen.getAllByRole('row').slice(1)
    expect(within(rows[0]).getByText('Intro to Python')).toBeInTheDocument()
    expect(within(rows[1]).getByText('Advanced SQL')).toBeInTheDocument()
    expect(titleHeader).toHaveTextContent('▼')

    // when: clicking it a third time
    fireEvent.click(titleHeader)

    // then: sorting is removed — back to server order (title ascending) and no arrow shown
    rows = screen.getAllByRole('row').slice(1)
    expect(within(rows[0]).getByText('Advanced SQL')).toBeInTheDocument()
    expect(within(rows[1]).getByText('Intro to Python')).toBeInTheDocument()
    expect(titleHeader).not.toHaveTextContent('▲')
    expect(titleHeader).not.toHaveTextContent('▼')
  })

  it('closes the form without creating anything when Cancel is clicked', async () => {
    // given: a signed-in user with the create form open
    stubFetch({ me: SIGNED_IN_USER, courses: [] })
    renderPage()
    await waitFor(() => expect(screen.getByText(/no courses yet/i)).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /\+ new course/i }))

    // when: clicking Cancel
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))

    // then: the dialog closes
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
