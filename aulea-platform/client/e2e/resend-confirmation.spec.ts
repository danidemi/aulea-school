import { test, expect, type Page } from '@playwright/test'
import { uniqueEmail } from './helpers'

// RESEND-CONFIRMATION-001 / SIGNUP-EXPIRY-001: real sign up and resend against the real
// server and Postgres, with mail captured by the disposable Mailpit (see
// `docker-compose.e2e.yml`); links are read back from Mailpit's HTTP API.

const EVIDENCE_DIR = '../../agile/aulea-platform/active_sprint/assets/RESEND-CONFIRMATION-001'
const MAIL_API = `http://localhost:${process.env.E2E_MAIL_API_PORT ?? '8026'}/api/v1`

/** Confirmation links mailed to `email`, oldest first. Waits until `count` mails are there. */
async function confirmationLinks(email: string, count: number): Promise<string[]> {
  let links: string[] = []
  await expect
    .poll(
      async () => {
        const search = await (await fetch(`${MAIL_API}/search?query=${encodeURIComponent(`to:${email}`)}`)).json()
        const ids: string[] = (search.messages ?? []).map((m: { ID: string }) => m.ID).reverse()
        links = []
        for (const id of ids) {
          const message = await (await fetch(`${MAIL_API}/message/${id}`)).json()
          const match = /https?:\/\/\S*\/api\/confirm\?token=[0-9a-f]+/.exec(message.Text)
          if (match) links.push(match[0])
        }
        return links.length
      },
      { timeout: 10_000 },
    )
    .toBe(count)
  return links
}

async function signUp(page: Page, email: string) {
  await page.goto('/signup')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password', { exact: true }).fill('correct-horse-1')
  await page.getByLabel('Confirm password').fill('correct-horse-1')
  await page.getByRole('button', { name: /^sign up$/i }).click()
  await expect(page.getByRole('heading', { name: /check your email/i })).toBeVisible()
}

test('resend from the confirmation view: countdown, new link works, old link is invalid', async ({ page }) => {
  const email = uniqueEmail('e2e-resend')
  await signUp(page, email)

  // SIGNUP-EXPIRY-001: the view states both durations
  await expect(page.getByRole('status')).toContainText(/24 hours/i)
  await expect(page.getByRole('status')).toContainText(/within 3 days/i)

  const button = page.getByRole('button', { name: /^resend email$/i })
  await expect(button).toBeEnabled()
  await page.screenshot({ path: `${EVIDENCE_DIR}/button-enabled.png` })

  await button.click()
  const waiting = page.getByRole('button', { name: /resend email \(\d+s\)/i })
  await expect(waiting).toBeDisabled()
  await page.screenshot({ path: `${EVIDENCE_DIR}/button-countdown.png` })

  // the countdown moves
  const first = await waiting.textContent()
  await expect.poll(async () => waiting.textContent()).not.toBe(first)

  const [oldLink, newLink] = await confirmationLinks(email, 2)
  await page.goto(oldLink)
  await expect(page).toHaveURL(/status=invalid/)
  await page.goto(newLink)
  await expect(page).toHaveURL(/status=ok/)
})

test('a reload does not bypass the limit: the email form gets the 429 countdown', async ({ page }) => {
  const email = uniqueEmail('e2e-resend-limit')
  await signUp(page, email)
  await page.getByRole('button', { name: /^resend email$/i }).click()
  await expect(page.getByRole('button', { name: /resend email \(\d+s\)/i })).toBeDisabled()

  // the confirmation view is component state: a reload shows the empty form again
  await page.reload()
  await expect(page.getByLabel('Email')).toBeVisible()
  await page.getByRole('button', { name: /already signed up but no email\? resend it/i }).click()
  await expect(page.getByLabel('Password')).toHaveCount(0)
  await page.getByLabel('Email').fill(email)
  await page.screenshot({ path: `${EVIDENCE_DIR}/already-signed-up-form.png` })
  await page.getByRole('button', { name: /^resend email$/i }).click()

  // the backend refuses: 429 puts the countdown back, using Retry-After
  await expect(page.getByRole('alert')).toContainText(/too many requests/i)
  await expect(page.getByRole('button', { name: /resend email \(\d+s\)/i })).toBeDisabled()
  await page.screenshot({ path: `${EVIDENCE_DIR}/too-many-requests.png` })

  // only the sign up mail and the one accepted resend went out
  await confirmationLinks(email, 2)
})

test('an unknown address gets the same neutral reply and no mail', async ({ page }) => {
  const email = uniqueEmail('e2e-resend-unknown')
  await page.goto('/signup')
  await page.getByRole('button', { name: /already signed up but no email\? resend it/i }).click()
  await page.getByLabel('Email').fill(email)
  await page.getByRole('button', { name: /^resend email$/i }).click()

  await expect(page.getByText(/a new email is on its way/i)).toBeVisible()
  const search = await (await fetch(`${MAIL_API}/search?query=${encodeURIComponent(`to:${email}`)}`)).json()
  expect(search.messages ?? []).toHaveLength(0)
})
