import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import LoginPage from './LoginPage'

// Covers AUTH-UX-001's DoD (active_sprint/story_auth_ux.md): the /login
// page has email/password fields, a "Don't have an account yet? Create
// one" link to /signup, and submits to POST /api/login.

describe('LoginPage (AUTH-UX-001)', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('always shows the email/password form and a submit button', () => {
    // given: the page has not been interacted with
    render(<LoginPage />)

    // when/then: the fields and submit button are present
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^sign in$/i })).toBeInTheDocument()
  })

  it('shows a "Don\'t have an account yet? Create one" link to /signup', () => {
    // given: the page has rendered
    render(<LoginPage />)

    // when/then: the link is present and points at /signup
    const link = screen.getByRole('link', { name: /create one/i })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/signup')
  })

  it('submits email/password to POST /api/login and navigates home on success', async () => {
    // given: the server will accept the sign-in
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ status: 200, json: () => Promise.resolve({ id: '1', email: 'trainer@example.com' }) })),
    )
    const assignSpy = vi.fn()
    vi.stubGlobal('location', { ...window.location, assign: assignSpy })
    render(<LoginPage />)

    // when: filling in the form and submitting it
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'trainer@example.com' } })
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'correcthorse' } })
    fireEvent.click(screen.getByRole('button', { name: /^sign in$/i }))

    // then: POST /api/login was called and the browser is sent to the home page
    await waitFor(() => expect(assignSpy).toHaveBeenCalledWith('/'))
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      '/api/login',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ email: 'trainer@example.com', password: 'correcthorse' }),
      }),
    )
  })

  it('shows a failure message when the server rejects the sign-in', async () => {
    // given: the server reports invalid credentials
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ status: 401, json: () => Promise.resolve({ error: 'invalid_credentials' }) })),
    )
    render(<LoginPage />)

    // when: submitting the form
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'trainer@example.com' } })
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'wrongpassword' } })
    fireEvent.click(screen.getByRole('button', { name: /^sign in$/i }))

    // then: the failure is shown, without navigating away
    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent(/invalid_credentials/i)
    })
  })
})
