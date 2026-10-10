import { test, expect } from '@playwright/test'
import { signUpAndLogIn, uniqueEmail } from './helpers'

// E2E-BROWSER-001: `/courses` (COURSE-001), reached by signing in — a
// signed-in visitor to `/` redirects there automatically
// (HOME-LOGIN-001), never a typed URL to `/courses` itself.

test('creates a course from the dashboard and sees it listed', async ({ page }) => {
  await signUpAndLogIn(page, uniqueEmail('e2e-courses'), 'correct-horse-1')
  await expect(page).toHaveURL(/\/courses$/)

  await page.getByRole('button', { name: /new course/i }).click()
  await page.getByLabel('Course name').fill('E2E Intro to Testing')
  await page.getByRole('button', { name: /^create$/i }).click()

  await expect(page.getByText('E2E Intro to Testing')).toBeVisible()
})
