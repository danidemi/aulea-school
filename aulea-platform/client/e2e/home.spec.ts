import { test, expect } from '@playwright/test'

// E2E-BROWSER-001: `/` (HOME-LOGIN-001) — the sign-in form shows
// directly on the home page, no click-through to `/login` needed.

test('shows the sign-in form directly on the home page', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible()
  await expect(page.getByLabel('Email')).toBeVisible()
  await expect(page.getByLabel('Password')).toBeVisible()
  await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()
})

test('shows a sign-up link to create an account', async ({ page }) => {
  await page.goto('/')

  await page.getByRole('link', { name: /sign up/i }).click()

  await expect(page.getByRole('heading', { name: /create your account/i })).toBeVisible()
})
