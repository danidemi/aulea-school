import { test, expect } from '@playwright/test'
import AdmZip from 'adm-zip'
import { signUpAndLogIn, uniqueEmail } from './helpers'

// QUIZ-TAKE-RENDER-001: replaces the QUIZ-SESSION-LIVE-STATUS-001 stub
// join/submit flow this spec used to drive with the real quiz-taking
// experience — a real multi-item `qti-assessment-test` package (choice
// interactions only, per this story's scope), answered end to end through
// the actual qti3-player UI, not a stub button. Two separate browser
// contexts (trainer + anonymous student), since the whole point of the
// take page is that the student has no session/cookie at all.

const SINGLE_CHOICE_ITEM = `<qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" identifier="single-choice-basic" title="Capital of France" adaptive="false" time-dependent="false">
  <qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="identifier">
    <qti-correct-response><qti-value>choice_b</qti-value></qti-correct-response>
  </qti-response-declaration>
  <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float"><qti-default-value><qti-value>0</qti-value></qti-default-value></qti-outcome-declaration>
  <qti-item-body>
    <qti-choice-interaction response-identifier="RESPONSE" shuffle="false" max-choices="1">
      <qti-prompt>What is the capital of France?</qti-prompt>
      <qti-simple-choice identifier="choice_a">Berlin</qti-simple-choice>
      <qti-simple-choice identifier="choice_b">Paris</qti-simple-choice>
    </qti-choice-interaction>
  </qti-item-body>
  <qti-response-processing template="https://purl.imsglobal.org/spec/qti/v3p0/rptemplates/match_correct"/>
</qti-assessment-item>`

const MULTIPLE_CHOICE_ITEM = `<qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" identifier="multiple-choice-basic" title="Prime numbers" adaptive="false" time-dependent="false">
  <qti-response-declaration identifier="RESPONSE" cardinality="multiple" base-type="identifier">
    <qti-correct-response><qti-value>choice_a</qti-value><qti-value>choice_c</qti-value></qti-correct-response>
  </qti-response-declaration>
  <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float"><qti-default-value><qti-value>0</qti-value></qti-default-value></qti-outcome-declaration>
  <qti-item-body>
    <qti-choice-interaction response-identifier="RESPONSE" shuffle="false" max-choices="0">
      <qti-prompt>Which of the following are prime numbers?</qti-prompt>
      <qti-simple-choice identifier="choice_a">2</qti-simple-choice>
      <qti-simple-choice identifier="choice_b">4</qti-simple-choice>
      <qti-simple-choice identifier="choice_c">7</qti-simple-choice>
    </qti-choice-interaction>
  </qti-item-body>
  <qti-response-processing template="https://purl.imsglobal.org/spec/qti/v3p0/rptemplates/match_correct"/>
</qti-assessment-item>`

const TEST_XML = `<qti-assessment-test xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" identifier="geography-quiz-test" title="Geography quiz">
  <qti-test-part identifier="part1" navigation-mode="linear" submission-mode="individual">
    <qti-assessment-section identifier="section1" title="Section 1" visible="true">
      <qti-assessment-item-ref identifier="single-choice-basic" href="./single-choice-basic.xml"/>
      <qti-assessment-item-ref identifier="multiple-choice-basic" href="./multiple-choice-basic.xml"/>
    </qti-assessment-section>
  </qti-test-part>
</qti-assessment-test>`

const MANIFEST = '<?xml version="1.0" encoding="UTF-8"?><manifest xmlns="http://www.imsglobal.org/xsd/imscp_v1p1"/>'

function buildQuizPackageZip(): Buffer {
  const zip = new AdmZip()
  zip.addFile('imsmanifest.xml', Buffer.from(MANIFEST, 'utf-8'))
  zip.addFile('test.xml', Buffer.from(TEST_XML, 'utf-8'))
  zip.addFile('single-choice-basic.xml', Buffer.from(SINGLE_CHOICE_ITEM, 'utf-8'))
  zip.addFile('multiple-choice-basic.xml', Buffer.from(MULTIPLE_CHOICE_ITEM, 'utf-8'))
  return zip.toBuffer()
}

test('a student takes a real multi-item choice-only quiz end to end, and the trainer sees it counted as answered', async ({ page, browser }) => {
  await signUpAndLogIn(page, uniqueEmail('e2e-take'), 'correct-horse-1')

  await page.getByRole('button', { name: /new course/i }).click()
  await page.getByLabel('Course name').fill('E2E Take Course')
  await page.getByRole('button', { name: /^create$/i }).click()
  await page.getByText('E2E Take Course').click()

  await page.locator('input[data-testid="upload-file-input"]').setInputFiles({
    name: 'geography-quiz.zip',
    mimeType: 'application/zip',
    buffer: buildQuizPackageZip(),
  })
  await page.getByRole('button', { name: /create session/i }).click()
  await expect(page).toHaveURL(/\/quiz-sessions\/[^/]+$/)

  const takeUrl = await page.getByRole('link', { name: /\/take$/ }).innerText()

  // start before the student joins, so the take page finds the session
  // `running` (no polling on that page — the DoD's approved flow is
  // manual refresh, not live status)
  await page.getByRole('button', { name: /^start$/i }).click()

  const studentContext = await browser.newContext()
  const studentPage = await studentContext.newPage()
  await studentPage.goto(takeUrl)

  // item 1: single-select — radios
  await expect(studentPage.getByTestId('quiz-question')).toContainText('Question 1 of 2')
  await studentPage.waitForSelector('[data-testid="quiz-question"] input[type="radio"]')
  const item1Inputs = studentPage.locator('[data-testid="quiz-question"] input[type="radio"]')
  await item1Inputs.nth(1).check() // choice_b (Paris)
  await studentPage.getByRole('button', { name: /^next$/i }).click()

  // item 2: multi-select — checkboxes
  await expect(studentPage.getByTestId('quiz-question')).toContainText('Question 2 of 2')
  await studentPage.waitForSelector('[data-testid="quiz-question"] input[type="checkbox"]')
  const item2Inputs = studentPage.locator('[data-testid="quiz-question"] input[type="checkbox"]')
  await item2Inputs.nth(0).check() // choice_a (2)
  await item2Inputs.nth(2).check() // choice_c (7)
  await studentPage.getByRole('button', { name: /^submit$/i }).click()

  await expect(studentPage.getByTestId('submitted-confirmation')).toBeVisible()
  // QUIZ-AUTO-EVAL-001: both answers were correct (choice_b, choice_a+choice_c)
  await expect(studentPage.getByTestId('quiz-score')).toHaveText('Your score: 2 / 2')

  await expect(page.getByTestId('block-2-live-status')).toContainText('1/1 answered', { timeout: 10_000 })

  await page.getByRole('button', { name: /^stop$/i }).click()
  await expect(page.getByTestId('block-3-results')).toBeVisible({ timeout: 10_000 })
  await expect(page.getByTestId('block-3-results')).toContainText('Class average: 100%')
  await expect(page.getByTestId('block-3-results')).toContainText('2 / 2')

  await studentContext.close()
})

test('opening the take-URL before the session starts, or after it stops, shows a message instead of quiz content', async ({ page, browser }) => {
  await signUpAndLogIn(page, uniqueEmail('e2e-take-status'), 'correct-horse-1')

  await page.getByRole('button', { name: /new course/i }).click()
  await page.getByLabel('Course name').fill('E2E Take Status Course')
  await page.getByRole('button', { name: /^create$/i }).click()
  await page.getByText('E2E Take Status Course').click()

  await page.locator('input[data-testid="upload-file-input"]').setInputFiles({
    name: 'geography-quiz.zip',
    mimeType: 'application/zip',
    buffer: buildQuizPackageZip(),
  })
  await page.getByRole('button', { name: /create session/i }).click()
  await expect(page).toHaveURL(/\/quiz-sessions\/[^/]+$/)
  const takeUrl = await page.getByRole('link', { name: /\/take$/ }).innerText()

  const studentContext = await browser.newContext()
  const studentPage = await studentContext.newPage()

  // before start
  await studentPage.goto(takeUrl)
  await expect(studentPage.getByTestId('not-started-message')).toBeVisible()

  // after stop
  await page.getByRole('button', { name: /^start$/i }).click()
  await page.getByRole('button', { name: /^stop$/i }).click()
  await studentPage.goto(takeUrl)
  await expect(studentPage.getByTestId('stopped-message')).toBeVisible()

  await studentContext.close()
})
