import { test, expect } from '@playwright/test'
import { uniqueEmail } from './helpers'

// E2E-BROWSER-001: `/signup`, reached by clicking through from `/`
// (never a typed URL). Uses "Expedite sign up" so the test doesn't need
// to fetch a confirmation email out of Mailpit.

test('creates an account via expedite sign up, reached from the home page', async ({ page }) => {
  const email = uniqueEmail('e2e-signup')

  await page.goto('/')
  await page.getByRole('link', { name: /sign up/i }).click()
  await expect(page.getByRole('heading', { name: /create your account/i })).toBeVisible()

  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password', { exact: true }).fill('correct-horse-1')
  await page.getByLabel('Confirm password').fill('correct-horse-1')
  await page.getByRole('button', { name: /expedite sign up/i }).click()

  await expect(page.getByRole('status')).toContainText(email)
})

// SIGNUP-002: a mismatch shows an inline error and disables submit; matching clears it.
test('shows a mismatch error under the confirm field, then signs up once the values match', async ({ page }) => {
  const email = uniqueEmail('e2e-signup-confirm')

  await page.goto('/signup')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password', { exact: true }).fill('correct-horse-1')
  await page.getByLabel('Confirm password').fill('correct-horse-2')
  await page.getByLabel('Confirm password').blur()

  await expect(page.getByRole('alert')).toContainText(/do not match/i)
  await expect(page.getByRole('button', { name: /^sign up$/i })).toBeDisabled()
  await page.screenshot({
    path: '../../agile/aulea-platform/active_sprint/assets/SIGNUP-002/mismatch-error.png',
  })

  await page.getByLabel('Confirm password').fill('correct-horse-1')
  await expect(page.getByRole('alert')).toHaveCount(0)
  await expect(page.getByRole('button', { name: /^sign up$/i })).toBeEnabled()
  // Expedite, as above: the e2e stack has no SMTP for the confirmation email.
  await page.getByRole('button', { name: /expedite sign up/i }).click()
  await expect(page.getByRole('status')).toContainText(email)
})
