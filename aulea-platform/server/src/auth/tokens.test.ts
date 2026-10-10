import { describe, it, expect } from 'vitest'
import { generateToken, hashToken } from './tokens.js'

describe('tokens (SIGN-UP-001)', () => {
  it('generates tokens long enough to resist guessing', () => {
    // given/when: a fresh token is generated
    const token = generateToken()

    // then: it is a 32-byte value, hex-encoded (64 hex characters)
    expect(token).toMatch(/^[0-9a-f]{64}$/)
  })

  it('generates a different token on each call', () => {
    // given/when: two tokens are generated
    const first = generateToken()
    const second = generateToken()

    // then: they are not the same
    expect(first).not.toBe(second)
  })

  it('hashes the same token to the same digest', () => {
    // given: a raw token
    const token = generateToken()

    // when: it is hashed twice
    // then: the digest is stable
    expect(hashToken(token)).toBe(hashToken(token))
  })

  it('hashes different tokens to different digests', () => {
    // given: two different raw tokens
    const first = generateToken()
    const second = generateToken()

    // when/then: their digests differ
    expect(hashToken(first)).not.toBe(hashToken(second))
  })
})
