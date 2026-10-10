import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import SignUpPage from './SignUpPage'

// Covers SIGNUP-EXPEDITE-001's DoD (active_sprint/story_expedite_sign_up.md):
// the expedite option is shown only once GET /api/config confirms the flag,
// and is absent while that hasn't happened yet / the flag is off.

describe('SignUpPage (SIGNUP-EXPEDITE-001)', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('does not show the expedite option before /api/config resolves', () => {
    // given: fetch never resolves within this assertion's timeframe
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})))

    // when: the signup page renders
    render(<SignUpPage />)

    // then: the expedite option is not shown yet
    expect(screen.queryByRole('button', { name: /expedite sign up/i })).not.toBeInTheDocument()
  })

  it('shows the expedite option once /api/config reports the flag enabled', async () => {
    // given: the server reports the expedite flag on
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ json: () => Promise.resolve({ expediteSignupEnabled: true }) })),
    )

    // when: the signup page renders and the config fetch resolves
    render(<SignUpPage />)

    // then: the expedite option appears
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /expedite sign up/i })).toBeInTheDocument()
    })
  })

  it('keeps the expedite option hidden when the flag is reported disabled', async () => {
    // given: the server reports the expedite flag off
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ json: () => Promise.resolve({ expediteSignupEnabled: false }) })),
    )

    // when: the signup page renders and the config fetch resolves
    render(<SignUpPage />)
    await waitFor(() => expect(vi.mocked(fetch)).toHaveBeenCalled())

    // then: the expedite option stays absent
    expect(screen.queryByRole('button', { name: /expedite sign up/i })).not.toBeInTheDocument()
  })

  it('always shows the normal email/password sign-up form', () => {
    // given: config hasn't resolved yet
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})))

    // when: the signup page renders
    render(<SignUpPage />)

    // then: the normal sign-up fields and submit are present regardless
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^sign up$/i })).toBeInTheDocument()
  })
})

// Covers SIGN-UP-001's DoD (active_sprint/story_sign_in_with_own_email.md):
// the normal "Sign up" submit calls POST /api/signup and reports the result.

describe('SignUpPage (SIGN-UP-001)', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('submits email/password to POST /api/signup and shows a success message', async () => {
    // given: the server will accept the sign-up
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url === '/api/config') {
          return Promise.resolve({ json: () => Promise.resolve({ expediteSignupEnabled: false }) })
        }
        return Promise.resolve({
          status: 201,
          json: () => Promise.resolve({ id: '1', email: 'new@example.com' }),
        })
      }),
    )
    render(<SignUpPage />)

    // when: filling in the form and submitting it
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'new@example.com' } })
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'longenough' } })
    fireEvent.click(screen.getByRole('button', { name: /^sign up$/i }))

    // then: POST /api/signup was called and a confirmation message is shown
    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent(/check your email/i)
    })
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      '/api/signup',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ email: 'new@example.com', password: 'longenough' }),
      }),
    )
  })

  it('shows a failure message when the server rejects the sign-up', async () => {
    // given: the server reports the email is already taken
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url === '/api/config') {
          return Promise.resolve({ json: () => Promise.resolve({ expediteSignupEnabled: false }) })
        }
        return Promise.resolve({ status: 409, json: () => Promise.resolve({ error: 'email_taken' }) })
      }),
    )
    render(<SignUpPage />)

    // when: submitting the form
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'taken@example.com' } })
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'longenough' } })
    fireEvent.click(screen.getByRole('button', { name: /^sign up$/i }))

    // then: the failure is shown
    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent(/email_taken/i)
    })
  })
})
