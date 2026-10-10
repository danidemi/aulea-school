import { test, expect } from '@playwright/test'
import { signUpAndLogIn, uniqueEmail } from './helpers'

// E2E-BROWSER-001 debt paid off here (QUIZ-SESSION-LIVE-STATUS-001's
// sprint planning): `/quiz-sessions/:sessionId` (QUIZ-SESSION-CONTROL-001)
// shipped without its own spec; this is it. Reached via "Create session"
// on a course's quizzes section — never a typed URL.

const VALID_QTI_ITEM = `<qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" identifier="q1" title="Sample question">
  <qti-item-body><p>What is 2 + 2?</p></qti-item-body>
</qti-assessment-item>`

test('creating a session opens its monitor page, and it can be started, stopped, and reopened', async ({ page }) => {
  await signUpAndLogIn(page, uniqueEmail('e2e-session'), 'correct-horse-1')

  await page.getByRole('button', { name: /new course/i }).click()
  await page.getByLabel('Course name').fill('E2E Session Course')
  await page.getByRole('button', { name: /^create$/i }).click()
  await page.getByText('E2E Session Course').click()

  await page.locator('input[data-testid="upload-file-input"]').setInputFiles({
    name: 'quiz.xml',
    mimeType: 'text/xml',
    buffer: Buffer.from(VALID_QTI_ITEM),
  })
  await expect(page.getByRole('button', { name: /create session/i })).toBeVisible()

  await page.getByRole('button', { name: /create session/i }).click()
  await expect(page).toHaveURL(/\/quiz-sessions\/[^/]+$/)

  // closed: QR + URL + time-limit input
  await expect(page.getByTestId('session-qr-code').locator('svg')).toBeVisible()
  await expect(page.getByLabel(/time limit/i)).toBeVisible()

  // start
  await page.getByLabel(/time limit/i).fill('75m')
  await page.getByRole('button', { name: /^start$/i }).click()
  await expect(page.getByRole('button', { name: /^stop$/i })).toBeVisible()
  await expect(page.getByText(/remaining/i)).toBeVisible()

  // stop, then reopen — not a dead end
  await page.getByRole('button', { name: /^stop$/i }).click()
  await expect(page.getByRole('button', { name: /reopen/i })).toBeVisible()
  await page.getByRole('button', { name: /reopen/i }).click()
  await expect(page.getByRole('button', { name: /^stop$/i })).toBeVisible()
})
