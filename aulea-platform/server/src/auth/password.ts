import bcrypt from 'bcryptjs'

/**
 * Shared password hashing module (SIGNUP-EXPEDITE-001, decided during
 * sprint planning 2026-08-21, recorded in ADR-0004). bcryptjs, cost
 * factor 10 — pure JS, no native build step. SIGN-UP-001 reuses this
 * unchanged.
 */
const COST_FACTOR = 10

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, COST_FACTOR)
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash)
}
