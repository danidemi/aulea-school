import { test, expect } from '@playwright/test'
import { signUpAndLogIn, uniqueEmail } from './helpers'

// E2E-BROWSER-001: `/courses/:courseId` (COURSE-DETAIL-001), reached by
// clicking a course row on `/courses` — never a typed URL. Replaces the
// old `/courses/:courseId/quizzes` target this suite would otherwise
// have pointed at.

test('clicking a course row opens its detail page with breadcrumb and quizzes section', async ({ page }) => {
  await signUpAndLogIn(page, uniqueEmail('e2e-detail'), 'correct-horse-1')

  await page.getByRole('button', { name: /new course/i }).click()
  await page.getByLabel('Course name').fill('E2E Detail Page Course')
  await page.getByRole('button', { name: /^create$/i }).click()
  await expect(page.getByText('E2E Detail Page Course')).toBeVisible()

  await page.getByText('E2E Detail Page Course').click()

  await expect(page).toHaveURL(/\/courses\/[^/]+$/)
  await expect(page.getByRole('navigation', { name: /breadcrumb/i })).toContainText('E2E Detail Page Course')
  await expect(page.getByRole('button', { name: /upload quiz/i })).toBeVisible()
  await expect(page.getByText(/no quizzes uploaded/i)).toBeVisible()
})
