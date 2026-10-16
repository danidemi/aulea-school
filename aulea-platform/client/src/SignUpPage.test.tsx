import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import SignUpPage from './SignUpPage'

function renderPage() {
  return render(
    <MemoryRouter>
      <SignUpPage />
    </MemoryRouter>,
  )
}

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
    renderPage()

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
    renderPage()

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
    renderPage()
    await waitFor(() => expect(vi.mocked(fetch)).toHaveBeenCalled())

    // then: the expedite option stays absent
    expect(screen.queryByRole('button', { name: /expedite sign up/i })).not.toBeInTheDocument()
  })

  it('always shows the normal email/password sign-up form', () => {
    // given: config hasn't resolved yet
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})))

    // when: the signup page renders
    renderPage()

    // then: the normal sign-up fields and submit are present regardless
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
    expect(screen.getByLabelText('Confirm password')).toBeInTheDocument()
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
    renderPage()

    // when: filling in the form and submitting it
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'new@example.com' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'longenough' } })
    fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'longenough' } })
    fireEvent.click(screen.getByRole('button', { name: /^sign up$/i }))

    // then: POST /api/signup was called and a confirmation message is shown
    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent(/check your email/i)
    })
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      '/api/signup',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ email: 'new@example.com', password: 'longenough', passwordConfirmation: 'longenough' }),
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
    renderPage()

    // when: submitting the form
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'taken@example.com' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'longenough' } })
    fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'longenough' } })
    fireEvent.click(screen.getByRole('button', { name: /^sign up$/i }))

    // then: the failure is shown
    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent(/email_taken/i)
    })
  })
})

// Covers SIGNUP-002's DoD (active_sprint/password-confirmation.md).

describe('SignUpPage (SIGNUP-002)', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function stubConfigOnly() {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ json: () => Promise.resolve({ expediteSignupEnabled: false }) })),
    )
  }

  it('shows an inline error and disables submit when the confirmation differs, on blur', () => {
    // given: the page with a password typed
    stubConfigOnly()
    renderPage()
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'longenough' } })

    // when: a different confirmation is typed and the field loses focus
    fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'different1' } })
    fireEvent.blur(screen.getByLabelText('Confirm password'))

    // then: the error shows and submit is disabled
    expect(screen.getByRole('alert')).toHaveTextContent(/do not match/i)
    expect(screen.getByRole('button', { name: /^sign up$/i })).toBeDisabled()
  })

  it('clears the error and re-enables submit once the values match', () => {
    // given: a visible mismatch error
    stubConfigOnly()
    renderPage()
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'longenough' } })
    fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'different1' } })
    fireEvent.blur(screen.getByLabelText('Confirm password'))

    // when: the confirmation is corrected
    fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'longenough' } })

    // then: the error is gone and submit is enabled
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^sign up$/i })).toBeEnabled()
  })

  it('does not call the sign-up API while the values differ', () => {
    // given: mismatching values
    stubConfigOnly()
    renderPage()
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'longenough' } })
    fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'different1' } })

    // when: submitting the form
    fireEvent.submit(screen.getByRole('button', { name: /^sign up$/i }).closest('form')!)

    // then: only the config fetch happened and the error is shown
    expect(vi.mocked(fetch)).not.toHaveBeenCalledWith('/api/signup', expect.anything())
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })
})

// Covers SIGNUP-CONFIRMATION-001's DoD (active_sprint/confirmation_page_after_signup.md):
// a successful sign up replaces the form with a confirmation view.

describe('SignUpPage (SIGNUP-CONFIRMATION-001)', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function stubServer(signupStatus: number, signupBody: object) {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url === '/api/config') {
          return Promise.resolve({ json: () => Promise.resolve({ expediteSignupEnabled: true }) })
        }
        return Promise.resolve({ status: signupStatus, json: () => Promise.resolve(signupBody) })
      }),
    )
  }

  async function fillForm(email: string) {
    await screen.findByRole('button', { name: /expedite sign up/i })
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: email } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'longenough' } })
    fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'longenough' } })
  }

  function expectFormGone() {
    expect(screen.queryByLabelText(/email/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Password')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Confirm password')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^sign up$/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /expedite sign up/i })).not.toBeInTheDocument()
  }

  it('replaces the form with "Check your email" after a 201 on sign up', async () => {
    // given: the server accepts the sign up
    stubServer(201, { id: '1', email: 'a@b.it' })
    renderPage()
    await fillForm('a@b.it')

    // when: submitting the normal sign up
    fireEvent.click(screen.getByRole('button', { name: /^sign up$/i }))

    // then: the confirmation view shows the address, the 24 h note and the login link; no form remains
    const status = await screen.findByRole('status')
    expect(status).toHaveTextContent(/check your email/i)
    expect(status).toHaveTextContent('a@b.it')
    expect(status).toHaveTextContent(/24 hours/i)
    expect(screen.getByRole('link', { name: /login/i })).toHaveAttribute('href', '/login')
    expectFormGone()
  })

  it('replaces the form with "Account created" after a 201 on expedite sign up', async () => {
    // given: the server accepts the expedite sign up
    stubServer(201, { id: '1', email: 'a@b.it' })
    renderPage()
    await fillForm('a@b.it')

    // when: using the expedite button
    fireEvent.click(screen.getByRole('button', { name: /expedite sign up/i }))

    // then: the view says "Account created", without the email note, and links to login
    const status = await screen.findByRole('status')
    expect(status).toHaveTextContent(/account created/i)
    expect(status).not.toHaveTextContent(/check your email/i)
    expect(status).not.toHaveTextContent(/24 hours/i)
    expect(screen.getByRole('link', { name: /login/i })).toHaveAttribute('href', '/login')
    expectFormGone()
  })

  it('keeps the form and shows the error after a 409', async () => {
    // given: the email is already taken
    stubServer(409, { error: 'email_taken' })
    renderPage()
    await fillForm('taken@b.it')

    // when: submitting
    fireEvent.click(screen.getByRole('button', { name: /^sign up$/i }))

    // then: the error is shown and the form is still there
    expect(await screen.findByRole('status')).toHaveTextContent(/email_taken/)
    expect(screen.getByRole('button', { name: /^sign up$/i })).toBeInTheDocument()
    expect(screen.queryByText(/check your email/i)).not.toBeInTheDocument()
  })

  it('keeps the form and shows the error after a 400', async () => {
    // given: the server rejects the input
    stubServer(400, { error: 'password_too_short' })
    renderPage()
    await fillForm('short@b.it')

    // when: submitting
    fireEvent.click(screen.getByRole('button', { name: /^sign up$/i }))

    // then: the error is shown and the form is still there
    expect(await screen.findByRole('status')).toHaveTextContent(/password_too_short/)
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
  })
})
