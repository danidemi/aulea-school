import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import App from './App'

// Covers HOME-001's original DoD (header states the product name) plus
// AUTH-UX-001's restructure: the header now links home, shows "Sign in"
// (linking to /login) for an unregistered user or the signed-in user's
// email once GET /api/me confirms a session, and the home page renders a
// dismissible confirm-outcome banner when opened with ?status=.

function stubFetch(meResponse: { status: number; body?: unknown }) {
  vi.stubGlobal(
    'fetch',
    vi.fn(() =>
      Promise.resolve({
        status: meResponse.status,
        json: () => Promise.resolve(meResponse.body ?? {}),
      }),
    ),
  )
}

describe('App (home page, HOME-001 / AUTH-UX-001)', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    window.history.pushState({}, '', '/')
  })

  it('shows a header with the product name, linking back to home', () => {
    // given: an unregistered user opens the home page
    stubFetch({ status: 401 })
    render(<App />)

    // when: the page has rendered
    // then: the header states the product name and links to /
    const link = screen.getByRole('link', { name: 'Learning Platform' })
    expect(link.closest('header')).not.toBeNull()
    expect(link).toHaveAttribute('href', '/')
  })

  it('shows a "Sign in" link to /login in the header before /api/me resolves', () => {
    // given: /api/me hasn't resolved yet
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})))

    // when: the page has rendered
    render(<App />)

    // then: a sign-in link is visible in the header, pointing at /login
    const link = screen.getByRole('link', { name: /sign in/i })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/login')
    expect(link.closest('header')).not.toBeNull()
  })

  it("shows the signed-in user's email in the account menu once GET /api/me confirms a session (USER-MENU-001)", async () => {
    // given: the server reports a signed-in user
    stubFetch({ status: 200, body: { id: '1', email: 'trainer@example.com' } })

    // when: the page renders, /api/me resolves, and the account menu is opened
    render(<App />)
    await waitFor(() => expect(screen.getByRole('button', { name: /account menu/i })).toBeInTheDocument())
    fireEvent.keyDown(screen.getByRole('button', { name: /account menu/i }), { key: 'Enter' })

    // then: the header shows an avatar (not "Sign in"), and the email is in the dropdown
    expect(screen.getByText('trainer@example.com')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /sign in/i })).not.toBeInTheDocument()
  })

  it("shows the user's current tenant next to their email in the account menu (TENANT-001 / USER-MENU-001)", async () => {
    // given: the server reports a signed-in user with a current tenant
    stubFetch({
      status: 200,
      body: { id: '1', email: 'trainer@example.com', tenant: { id: '1', name: "trainer@example.com's workspace" } },
    })

    // when: the page renders, /api/me resolves, and the account menu is opened
    render(<App />)
    await waitFor(() => expect(screen.getByRole('button', { name: /account menu/i })).toBeInTheDocument())
    fireEvent.keyDown(screen.getByRole('button', { name: /account menu/i }), { key: 'Enter' })

    // then: the tenant name is shown inside the opened dropdown
    expect(screen.getByText("trainer@example.com's workspace")).toBeInTheDocument()
  })

  it('shows a sign-up link pointing to /signup when signed out', async () => {
    // given: an unregistered user opens the home page
    stubFetch({ status: 401 })

    // when: the page has rendered and /api/me resolves
    render(<App />)
    await waitFor(() => expect(vi.mocked(fetch)).toHaveBeenCalled())

    // then: a sign-up link is visible and points at /signup
    const link = screen.getByRole('link', { name: /sign up/i })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/signup')
  })

  it('hides the sign-up link once signed in', async () => {
    // given: the server reports a signed-in user
    stubFetch({ status: 200, body: { id: '1', email: 'trainer@example.com' } })

    // when: the page renders and /api/me resolves
    render(<App />)
    await waitFor(() => expect(screen.getByRole('button', { name: /account menu/i })).toBeInTheDocument())

    // then: the sign-up link is no longer shown
    expect(screen.queryByRole('link', { name: /sign up/i })).not.toBeInTheDocument()
  })
})

// Covers HOME-LOGIN-001's DoD (active_sprint/story_login_form_on_home.md):
// the home page shows the shared sign-in form directly, and a signed-in
// visitor is redirected to /courses.
describe('App sign-in form and signed-in redirect (HOME-LOGIN-001)', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    window.history.pushState({}, '', '/')
  })

  it('shows the sign-in form directly on the home page when signed out', () => {
    // given: an unregistered/signed-out user
    stubFetch({ status: 401 })

    // when: the home page renders
    render(<App />)

    // then: the same email/password sign-in form is shown, no extra click needed
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^sign in$/i })).toBeInTheDocument()
  })

  it('submits the home-page form the same way /login does', async () => {
    // given: an unregistered user on the home page
    const assignSpy = vi.fn()
    vi.stubGlobal('location', { ...window.location, assign: assignSpy })
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url === '/api/me') return Promise.resolve({ status: 401, json: () => Promise.resolve({}) })
        if (url === '/api/login') return Promise.resolve({ status: 200, json: () => Promise.resolve({ ok: true }) })
        return Promise.resolve({ status: 404, json: () => Promise.resolve({}) })
      }),
    )
    render(<App />)

    // when: filling in and submitting the form
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'trainer@example.com' } })
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'secret' } })
    fireEvent.click(screen.getByRole('button', { name: /^sign in$/i }))

    // then: POST /api/login is called and the browser navigates home
    await waitFor(() => expect(assignSpy).toHaveBeenCalledWith('/'))
  })

  it('redirects a signed-in visitor away from the home page to /courses', async () => {
    // given: /api/me confirms a session
    const assignSpy = vi.fn()
    vi.stubGlobal('location', { ...window.location, assign: assignSpy })
    stubFetch({ status: 200, body: { id: '1', email: 'trainer@example.com' } })

    // when: the home page renders and /api/me resolves
    render(<App />)

    // then: the browser is sent to /courses
    await waitFor(() => expect(assignSpy).toHaveBeenCalledWith('/courses'))
  })

  it('does not redirect while signed out', async () => {
    // given: an unregistered user
    const assignSpy = vi.fn()
    vi.stubGlobal('location', { ...window.location, assign: assignSpy })
    stubFetch({ status: 401 })

    // when: the home page renders and /api/me resolves
    render(<App />)
    await waitFor(() => expect(vi.mocked(fetch)).toHaveBeenCalled())

    // then: no redirect happens
    expect(assignSpy).not.toHaveBeenCalled()
  })
})

// Covers AUTH-UX-001's confirm-outcome banner: GET /api/confirm now
// redirects to /?status=..., and the home page renders it instead of the
// retired /confirm-result page.
describe('App confirm-outcome banner (AUTH-UX-001)', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    window.history.pushState({}, '', '/')
  })

  function renderWithStatus(status: string) {
    stubFetch({ status: 401 })
    window.history.pushState({}, '', `/?status=${status}`)
    render(<App />)
  }

  it('shows a success banner for status=ok', () => {
    renderWithStatus('ok')
    expect(screen.getByRole('status')).toHaveTextContent(/confirmed/i)
  })

  it('shows an expired banner for status=expired', () => {
    renderWithStatus('expired')
    expect(screen.getByRole('status')).toHaveTextContent(/expired/i)
  })

  it('shows a used banner for status=used', () => {
    renderWithStatus('used')
    expect(screen.getByRole('status')).toHaveTextContent(/already been used/i)
  })

  it('shows an invalid banner for status=invalid', () => {
    renderWithStatus('invalid')
    expect(screen.getByRole('status')).toHaveTextContent(/not valid/i)
  })

  it('shows no banner when there is no ?status= at all', () => {
    stubFetch({ status: 401 })
    render(<App />)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('dismisses the banner when its close button is clicked', () => {
    renderWithStatus('ok')
    fireEvent.click(screen.getByRole('button', { name: /dismiss/i }))
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})

// Covers LOGOUT-001's DoD (active_sprint/story_logout.md): a signed-in
// header shows a log-out control instead of "Sign in"; clicking it calls
// POST /api/logout and returns to a signed-out home page.
describe('App log-out control (LOGOUT-001)', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    window.history.pushState({}, '', '/')
  })

  function stubSignedInThenLogout(logoutSpy: (init?: RequestInit) => void) {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string, init?: RequestInit) => {
        if (url === '/api/logout') {
          logoutSpy(init)
          return Promise.resolve({ status: 200, json: () => Promise.resolve({ ok: true }) })
        }
        return Promise.resolve({ status: 200, json: () => Promise.resolve({ id: '1', email: 'trainer@example.com' }) })
      }),
    )
  }

  it('shows a "Log out" control in the account menu instead of "Sign in" once signed in (USER-MENU-001)', async () => {
    // given: a signed-in user
    stubSignedInThenLogout(vi.fn())

    // when: the page renders, /api/me resolves, and the account menu is opened
    render(<App />)
    await waitFor(() => expect(screen.getByRole('button', { name: /account menu/i })).toBeInTheDocument())
    fireEvent.keyDown(screen.getByRole('button', { name: /account menu/i }), { key: 'Enter' })

    // then: a log-out control is shown, and "Sign in" is not
    expect(screen.getByRole('menuitem', { name: /log out/i })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /sign in/i })).not.toBeInTheDocument()
  })

  it('calls POST /api/logout and navigates home when "Log out" is clicked', async () => {
    // given: a signed-in user with the account menu open
    const logoutSpy = vi.fn()
    stubSignedInThenLogout(logoutSpy)
    const assignSpy = vi.fn()
    vi.stubGlobal('location', { ...window.location, assign: assignSpy })
    render(<App />)
    await waitFor(() => expect(screen.getByRole('button', { name: /account menu/i })).toBeInTheDocument())
    fireEvent.keyDown(screen.getByRole('button', { name: /account menu/i }), { key: 'Enter' })

    // when: clicking "Log out"
    fireEvent.click(screen.getByRole('menuitem', { name: /log out/i }))

    // then: the server is told to end the session, and the browser returns home
    await waitFor(() => expect(logoutSpy).toHaveBeenCalledWith(expect.objectContaining({ method: 'POST' })))
    expect(assignSpy).toHaveBeenCalledWith('/')
  })
})
