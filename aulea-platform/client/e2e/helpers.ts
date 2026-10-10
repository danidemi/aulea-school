import type { Page } from '@playwright/test'

// Shared UI-navigation-only helper: creates a confirmed account (via the
// "Expedite sign up" button, so no email/Mailpit round trip is needed)
// and signs in, all by clicking through the real screens — never a
// typed URL beyond the initial `/` load. Used by specs that need a
// signed-in user to reach their target screen.
export async function signUpAndLogIn(page: Page, email: string, password: string) {
  await page.goto('/')
  await page.getByRole('link', { name: /sign up/i }).click()
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: /expedite sign up/i }).click()
  await page.getByRole('status').waitFor()

  // Back to the home page via the header's brand link — not a typed URL —
  // then sign in with the freshly-created account.
  await page.getByRole('link', { name: /learning platform/i }).click()
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: /sign in/i }).click()
}

export function uniqueEmail(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2)}@example.com`
}
