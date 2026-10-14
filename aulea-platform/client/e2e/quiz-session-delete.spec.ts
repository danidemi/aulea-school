import { test, expect } from '@playwright/test'
import { signUpAndLogIn, uniqueEmail } from './helpers'

// SESSION-DELETE-001: select sessions on a quiz's history page, confirm
// in a dialog, and the sessions with their connections and answers are
// hard-deleted. A running session cannot be selected. Reached by clicking
// through (course -> "Sessions"), never a typed URL.

const VALID_QTI_ITEM = `<qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" identifier="q1" title="Sample question">
  <qti-item-body><p>What is 2 + 2?</p></qti-item-body>
</qti-assessment-item>`

const SCREENSHOT_DIR = '../../agile/aulea-platform/active_sprint/assets/SESSION-DELETE-001'

test('deletes selected sessions after a confirmation showing the answer count', async ({ page }) => {
  await signUpAndLogIn(page, uniqueEmail('e2e-delete'), 'correct-horse-1')

  await page.getByRole('button', { name: /new course/i }).click()
  await page.getByLabel('Course name').fill('E2E Delete Course')
  await page.getByRole('button', { name: /^create$/i }).click()
  await page.getByText('E2E Delete Course').click()
  await page.locator('input[data-testid="upload-file-input"]').setInputFiles({
    name: 'quiz.xml',
    mimeType: 'text/xml',
    buffer: Buffer.from(VALID_QTI_ITEM),
  })

  // Session 1: closed, with one student connection that left one answer.
  await page.getByRole('button', { name: /create session/i }).click()
  await expect(page).toHaveURL(/\/quiz-sessions\/[^/]+$/)
  const firstSessionId = page.url().split('/').pop()!
  const connection = await page.request.post(`/api/quiz-sessions/${firstSessionId}/connections`)
  const { id: connectionId } = await connection.json()
  const answer = await page.request.post(`/api/quiz-sessions/${firstSessionId}/connections/${connectionId}/answers`, {
    data: { itemPath: 'quiz.xml', responses: null },
  })
  expect(answer.status()).toBe(201)

  // Session 2: started, so it is running.
  await page.getByRole('link', { name: 'E2E Delete Course' }).click()
  await page.getByRole('button', { name: /create session/i }).click()
  await expect(page).toHaveURL(/\/quiz-sessions\/[^/]+$/)
  await page.getByRole('button', { name: /^start$/i }).click()
  await expect(page.getByRole('button', { name: /^stop$/i })).toBeVisible()

  await page.getByRole('link', { name: 'E2E Delete Course' }).click()
  await page.getByRole('button', { name: /^sessions$/i }).click()
  await expect(page.getByRole('row')).toHaveCount(3) // header + 2 sessions

  const deleteButton = page.getByRole('button', { name: /delete selected/i })
  await expect(deleteButton).toBeDisabled()

  // The running session cannot be selected.
  const runningRow = page.getByRole('row').filter({ hasText: 'running' })
  await expect(runningRow.getByRole('checkbox')).toBeDisabled()

  // Select the closed one: the dialog states 1 session and 1 answer.
  const closedRow = page.getByRole('row').filter({ hasText: 'closed' })
  await closedRow.getByRole('checkbox').click()
  await expect(deleteButton).toBeEnabled()
  await page.screenshot({ path: `${SCREENSHOT_DIR}/list-selected.png` })
  await deleteButton.click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toContainText('1 session and 1 answer')
  await page.screenshot({ path: `${SCREENSHOT_DIR}/confirm-dialog.png` })

  // Cancel changes nothing.
  await dialog.getByRole('button', { name: /cancel/i }).click()
  await expect(page.getByRole('row')).toHaveCount(3)

  // Confirm deletes it and refreshes the list.
  await deleteButton.click()
  await expect(page.getByRole('dialog')).toContainText('1 session and 1 answer')
  await page.getByRole('dialog').getByRole('button', { name: /^delete$/i }).click()
  await expect(page.getByRole('row')).toHaveCount(2)
  await expect(page.getByRole('row').filter({ hasText: 'closed' })).toHaveCount(0)
  await expect(deleteButton).toBeDisabled()
})
