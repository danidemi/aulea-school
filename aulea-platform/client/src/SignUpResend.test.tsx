import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import SignUpPage from './SignUpPage'

// Covers RESEND-CONFIRMATION-001's client side (the "Resend email" button with its
// countdown, the "Already signed up" form) and SIGNUP-EXPIRY-001's confirmation note.

type Reply = { status: number; body?: unknown; retryAfter?: string }

function stubServer(options: { config?: Record<string, unknown>; resend?: Reply } = {}) {
  const resendReply = options.resend ?? { status: 200, body: {} }
  const fetchStub = vi.fn((url: string, _init?: RequestInit) => {
    if (url === '/api/config') {
      return Promise.resolve({
        json: () => Promise.resolve({ expediteSignupEnabled: false, pendingMaxAgeDays: 3, resendCooldownSeconds: 60, ...options.config }),
      })
    }
    if (url === '/api/signup') {
      return Promise.resolve({ status: 201, json: () => Promise.resolve({ id: '1', email: 'new@example.com' }) })
    }
    return Promise.resolve({
      status: resendReply.status,
      headers: new Headers(resendReply.retryAfter ? { 'Retry-After': resendReply.retryAfter } : {}),
      json: () => Promise.resolve(resendReply.body ?? {}),
    })
  })
  vi.stubGlobal('fetch', fetchStub)
  return fetchStub
}

function renderPage() {
  return render(
    <MemoryRouter>
      <SignUpPage />
    </MemoryRouter>,
  )
}

async function signUp() {
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'new@example.com' } })
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'longenough' } })
  fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'longenough' } })
  fireEvent.click(screen.getByRole('button', { name: /^sign up$/i }))
  await screen.findByRole('heading', { name: /check your email/i })
}

const resendCalls = (fetchStub: ReturnType<typeof stubServer>) =>
  fetchStub.mock.calls.filter(([url]) => url === '/api/signup/resend')

describe('SignUpConfirmation resend button (RESEND-CONFIRMATION-001)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('is enabled at first, and after a click is disabled with a countdown that ticks down', async () => {
    // given: a signed-up user on the confirmation view, cooldown 60 s
    const fetchStub = stubServer()
    renderPage()
    await signUp()
    const button = screen.getByRole('button', { name: /^resend email$/i })
    expect(button).toBeEnabled()

    // when: clicking it
    fireEvent.click(button)

    // then: the address was posted and the button is disabled showing the cooldown
    await screen.findByRole('button', { name: /resend email \(60s\)/i })
    expect(resendCalls(fetchStub)[0][1]).toMatchObject({ method: 'POST', body: JSON.stringify({ email: 'new@example.com' }) })
    expect(screen.getByRole('button', { name: /resend email \(60s\)/i })).toBeDisabled()
    expect(screen.getByText(/a new email is on its way/i)).toBeInTheDocument()

    // and: one second later it reads 59
    await act(async () => {
      vi.advanceTimersByTime(1000)
    })
    expect(screen.getByRole('button', { name: /resend email \(59s\)/i })).toBeDisabled()
  })

  it('is enabled again once the countdown reaches zero', async () => {
    // given: a cooldown of 2 s and a click
    stubServer({ config: { resendCooldownSeconds: 2 } })
    renderPage()
    await signUp()
    fireEvent.click(screen.getByRole('button', { name: /^resend email$/i }))
    await screen.findByRole('button', { name: /resend email \(2s\)/i })

    // when: two seconds pass, one tick at a time
    for (let tick = 0; tick < 2; tick++) {
      await act(async () => {
        vi.advanceTimersByTime(1000)
      })
    }

    // then: it can be clicked again
    expect(screen.getByRole('button', { name: /^resend email$/i })).toBeEnabled()
  })

  it('puts the countdown back from Retry-After on a 429', async () => {
    // given: the server refuses with 42 seconds left
    stubServer({ resend: { status: 429, retryAfter: '42', body: { error: 'too_many_requests' } } })
    renderPage()
    await signUp()

    // when: clicking
    fireEvent.click(screen.getByRole('button', { name: /^resend email$/i }))

    // then: the countdown starts at 42 and the limit message is shown
    await screen.findByRole('button', { name: /resend email \(42s\)/i })
    expect(screen.getByRole('alert')).toHaveTextContent(/too many requests/i)
    expect(screen.getByRole('alert')).toHaveTextContent(/try again in 42 seconds/i)
  })

  it('shows an error and stays usable when the email could not be sent', async () => {
    // given: the server answers 500
    stubServer({ resend: { status: 500, body: { error: 'internal_error' } } })
    renderPage()
    await signUp()

    // when: clicking
    fireEvent.click(screen.getByRole('button', { name: /^resend email$/i }))

    // then: an error shows and the button is not locked
    await screen.findByRole('alert')
    expect(screen.getByRole('alert')).toHaveTextContent(/could not be sent/i)
    expect(screen.getByRole('button', { name: /^resend email$/i })).toBeEnabled()
  })
})

describe('SignUpConfirmation expiry note (SIGNUP-EXPIRY-001)', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('tells the user the link lasts 24 hours and the registration is dropped after 3 days', async () => {
    // given: the default config
    stubServer()
    renderPage()
    await waitFor(() => expect(vi.mocked(fetch)).toHaveBeenCalled())

    // when: signing up
    await signUp()

    // then: both durations are stated
    expect(screen.getByText(/valid for 24 hours/i)).toHaveTextContent(/within 3 days.*sign up again/i)
  })

  it('takes the number of days from /api/config', async () => {
    // given: a server configured for 7 days
    stubServer({ config: { pendingMaxAgeDays: 7 } })
    renderPage()
    await waitFor(() => expect(vi.mocked(fetch)).toHaveBeenCalled())
    await act(async () => {})

    // when: signing up
    await signUp()

    // then: the note says 7
    expect(screen.getByText(/valid for 24 hours/i)).toHaveTextContent(/within 7 days/i)
  })
})

describe('"Already signed up" resend form (RESEND-CONFIRMATION-001)', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('swaps the card to an email-only form and posts the typed address', async () => {
    // given: the empty sign up page (a reload, or a later visit)
    const fetchStub = stubServer()
    renderPage()

    // when: opening the resend form, typing an address and submitting
    fireEvent.click(screen.getByRole('button', { name: /already signed up but no email\? resend it/i }))
    expect(screen.queryByLabelText('Password')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^resend email$/i })).toBeDisabled() // no address yet
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'lost@example.com' } })
    fireEvent.click(screen.getByRole('button', { name: /^resend email$/i }))

    // then: the same neutral reply and countdown as the button
    await screen.findByRole('button', { name: /resend email \(60s\)/i })
    expect(resendCalls(fetchStub)[0][1]).toMatchObject({ body: JSON.stringify({ email: 'lost@example.com' }) })
    expect(screen.getByText(/a new email is on its way/i)).toBeInTheDocument()
  })

  it('shows the 429 countdown and can go back to the sign up form', async () => {
    // given: the server refuses with 30 seconds left
    stubServer({ resend: { status: 429, retryAfter: '30' } })
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: /already signed up but no email\? resend it/i }))
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'lost@example.com' } })

    // when: submitting
    fireEvent.click(screen.getByRole('button', { name: /^resend email$/i }))

    // then: the countdown shows the server's wait
    await screen.findByRole('button', { name: /resend email \(30s\)/i })
    expect(screen.getByRole('alert')).toHaveTextContent(/try again in 30 seconds/i)

    // and: going back shows the sign up form again
    fireEvent.click(screen.getByRole('button', { name: /back to sign up/i }))
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
  })
})
