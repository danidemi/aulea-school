import { describe, it, expect } from 'vitest'
import { hashPassword, verifyPassword } from './password.js'

describe('password hashing (SIGNUP-EXPEDITE-001)', () => {
  it('hashes a password to something other than the plain text', async () => {
    // given: a plain-text password
    const plain = 'correct-horse-battery-staple'

    // when: it is hashed
    const hash = await hashPassword(plain)

    // then: the stored value is not the plain text itself
    expect(hash).not.toBe(plain)
    expect(hash.length).toBeGreaterThan(0)
  })

  it('verifies the correct password against its own hash', async () => {
    // given: a hashed password
    const hash = await hashPassword('correct-horse-battery-staple')

    // when: the same plain text is verified against it
    const result = await verifyPassword('correct-horse-battery-staple', hash)

    // then: it matches
    expect(result).toBe(true)
  })

  it('rejects an incorrect password against an existing hash', async () => {
    // given: a hashed password
    const hash = await hashPassword('correct-horse-battery-staple')

    // when: a different plain text is verified against it
    const result = await verifyPassword('wrong-password', hash)

    // then: it does not match
    expect(result).toBe(false)
  })
})
