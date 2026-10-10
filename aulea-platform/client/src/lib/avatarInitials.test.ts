import { describe, it, expect } from 'vitest'
import { avatarInitials } from './avatarInitials'

describe('avatarInitials (USER-MENU-001)', () => {
  it('given an email whose local part has 2+ alphabetic characters, when computing initials, then returns the first two, uppercased', () => {
    expect(avatarInitials('trainer1@seed.local')).toBe('TR')
  })

  it('given an email whose local part has fewer than 2 alphabetic characters, when computing initials, then falls back to the first character as-is, uppercased', () => {
    expect(avatarInitials('1@seed.local')).toBe('1')
  })

  it('given an email whose local part is a single letter, when computing initials, then returns that one letter, uppercased', () => {
    expect(avatarInitials('a@seed.local')).toBe('A')
  })

  it('given an email with mixed-case letters, when computing initials, then uppercases the result', () => {
    expect(avatarInitials('joDoe@example.com')).toBe('JO')
  })
})
