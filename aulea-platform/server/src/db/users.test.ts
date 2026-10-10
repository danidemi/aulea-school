import { describe, it, expect } from 'vitest'
import { isUniqueViolation, UNIQUE_VIOLATION } from './users.js'

describe('isUniqueViolation (SIGNUP-EXPEDITE-001)', () => {
  it('matches the wrapped shape drizzle-orm/node-postgres actually throws', () => {
    // given: a DrizzleQueryError-shaped error with the SQLSTATE nested on .cause
    const err = Object.assign(new Error('duplicate key'), { cause: { code: UNIQUE_VIOLATION } })

    // when/then: it is recognized as a unique violation
    expect(isUniqueViolation(err)).toBe(true)
  })

  it('matches a flat pg error shape with .code set directly', () => {
    // given: an error with the SQLSTATE directly on .code (no wrapping)
    const err = { code: UNIQUE_VIOLATION }

    // when/then: it is still recognized
    expect(isUniqueViolation(err)).toBe(true)
  })

  it('does not match an unrelated error', () => {
    // given: a plain error with no SQLSTATE at all
    const err = new Error('connection refused')

    // when/then: it is not treated as a unique violation
    expect(isUniqueViolation(err)).toBe(false)
  })

  it('does not match a different SQLSTATE code', () => {
    // given: a wrapped error with a different Postgres error code
    const err = Object.assign(new Error('not null violation'), { cause: { code: '23502' } })

    // when/then: it is not treated as a unique violation
    expect(isUniqueViolation(err)).toBe(false)
  })
})
