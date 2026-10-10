import { test, expect } from '@playwright/test'
import { uniqueEmail } from './helpers'

// E2E-BROWSER-001: `/login` still exists and works for a direct
// bookmark/link — reached here by clicking the header's "Sign in" link
// from a page that isn't the home page itself (`/signup`, once signed
// out), never a typed URL.

test('signs in from /login and lands on /courses (a bookmark to /login still works)', async ({ page }) => {
  const email = uniqueEmail('e2e-login')
  const password = 'correct-horse-1'

  // given: an account created via /signup's expedite option
  await page.goto('/')
  await page.getByRole('link', { name: /sign up/i }).click()
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: /expedite sign up/i }).click()
  await page.getByRole('status').waitFor()

  // when: reaching /login via the header's "Sign in" link (not the home
  // page's own inline form) and signing in there
  await page.getByRole('link', { name: /sign in/i }).click()
  await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible()
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: /sign in/i }).click()

  // then: signed in and redirected to the courses dashboard
  await expect(page).toHaveURL(/\/courses$/)
  await expect(page.getByRole('button', { name: /new course/i })).toBeVisible()
})
