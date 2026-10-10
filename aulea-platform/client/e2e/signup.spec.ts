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
  await page.getByLabel('Password').fill('correct-horse-1')
  await page.getByRole('button', { name: /expedite sign up/i }).click()

  await expect(page.getByRole('status')).toContainText(email)
})
