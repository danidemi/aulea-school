import { test, expect } from '@playwright/test'
import AdmZip from 'adm-zip'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { signUpAndLogIn, uniqueEmail } from './helpers'

// QUIZ-SESSION-PER-STUDENT-DELIVERY-001/ADR-0013: real-browser coverage
// the server/client unit and route-level tests can't give — a shuffled
// item's round-tripped XML actually renders correctly under
// @longsightgroup/qti3-player-react (a live Custom Element, not something
// jsdom can be trusted to reproduce — same reasoning
// quiz-session-take.spec.ts's own header comment gives for why the
// rendering slice of QUIZ-TAKE-RENDER-001 is Playwright-only), and that
// two students in the same session each get their own connection's
// independently-generated order.
//
// Uses the real `sample-shuffle-*` fixture package server/test-fixtures
// ships (QUIZ-SESSION-PER-STUDENT-DELIVERY-001's own fixture, read
// straight off disk here rather than re-inlined), whose
// choice-shuffle-true item is authored shuffle="true" — genuinely
// shuffled per student even with no force-shuffle trainer toggle (out of
// this tech PBI's scope; ADR-0013's default-off-honors-authored-attribute
// path is exactly what this spec exercises).

const FIXTURES_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'server', 'test-fixtures', 'qti-samples')

function readFixture(name: string): Buffer {
  return readFileSync(path.join(FIXTURES_DIR, name))
}

const MANIFEST = '<?xml version="1.0" encoding="UTF-8"?><manifest xmlns="http://www.imsglobal.org/xsd/imscp_v1p1"/>'

function buildShufflePackageZip(): Buffer {
  const zip = new AdmZip()
  zip.addFile('imsmanifest.xml', Buffer.from(MANIFEST, 'utf-8'))
  zip.addFile('test.xml', readFixture('sample-shuffle-test.xml'))
  for (const name of [
    'sample-shuffle-question-a.xml',
    'sample-shuffle-question-b.xml',
    'sample-shuffle-question-c.xml',
    'sample-shuffle-question-d.xml',
    'sample-shuffle-choice-shuffle-true.xml',
    'sample-shuffle-choice-shuffle-false.xml',
  ]) {
    zip.addFile(name, readFixture(name))
  }
  return zip.toBuffer()
}

test('a shuffled item renders correctly, and two students in the same session get independently generated orders', async ({ page, browser }) => {
  await signUpAndLogIn(page, uniqueEmail('e2e-shuffle'), 'correct-horse-1')

  await page.getByRole('button', { name: /new course/i }).click()
  await page.getByLabel('Course name').fill('E2E Shuffle Course')
  await page.getByRole('button', { name: /^create$/i }).click()
  await page.getByText('E2E Shuffle Course').click()

  await page.locator('input[data-testid="upload-file-input"]').setInputFiles({
    name: 'shuffle-quiz.zip',
    mimeType: 'application/zip',
    buffer: buildShufflePackageZip(),
  })
  await page.getByRole('button', { name: /create session/i }).click()
  await expect(page).toHaveURL(/\/quiz-sessions\/[^/]+$/)

  const takeUrl = await page.getByRole('link', { name: /\/take$/ }).innerText()

  // Starting with both trainer-facing toggles left unchecked (their
  // default) still exercises the authored shuffle="true" items/section
  // (ADR-0013's "off = follow authored XML" path) — QUIZ-RANDOM-QUESTION
  // -ORDER-001/QUIZ-RANDOM-ANSWER-ORDER-001's own toggle wiring is
  // exercised by the second test below, forcing shuffle on instead.
  await expect(page.getByLabel(/force shuffle questions/i)).not.toBeChecked()
  await expect(page.getByLabel(/force shuffle answers/i)).not.toBeChecked()
  await page.getByRole('button', { name: /^start$/i }).click()

  // Two SEPARATE browser contexts, not two tabs of the same browser:
  // connectionId is localStorage-scoped per browser (QUIZ-CONNECTION
  // -related convention already established by
  // BUG-QUIZ-REFRESH-DUP-SESSION), so two tabs of one context would share
  // a connection instead of getting two independent ones.
  const contextA = await browser.newContext()
  const contextB = await browser.newContext()
  const studentA = await contextA.newPage()
  const studentB = await contextB.newPage()

  const [itemsResponseA] = await Promise.all([studentA.waitForResponse((res) => /\/connections\/[^/]+\/items$/.test(res.url())), studentA.goto(takeUrl)])
  const [itemsResponseB] = await Promise.all([studentB.waitForResponse((res) => /\/connections\/[^/]+\/items$/.test(res.url())), studentB.goto(takeUrl)])

  const connectionIdA = /\/connections\/([^/]+)\/items$/.exec(itemsResponseA.url())?.[1]
  const connectionIdB = /\/connections\/([^/]+)\/items$/.exec(itemsResponseB.url())?.[1]
  expect(connectionIdA).toBeTruthy()
  expect(connectionIdB).toBeTruthy()
  // Each browser joined its own connection — never the same one.
  expect(connectionIdA).not.toBe(connectionIdB)

  const bodyA = await itemsResponseA.json()
  const bodyB = await itemsResponseB.json()

  // Both connections were served the same set of items (nothing lost,
  // nothing duplicated) — independently generated, not necessarily
  // distinct (a real RNG can coincidentally agree; the DoD is explicit
  // that distinctness is not asserted).
  const identifiersA = bodyA.items.map((item: { identifier: string }) => item.identifier).sort()
  const identifiersB = bodyB.items.map((item: { identifier: string }) => item.identifier).sort()
  expect(identifiersA).toEqual(identifiersB)
  expect(identifiersA).toEqual(['choice-shuffle-false', 'choice-shuffle-true', 'question-a', 'question-b', 'question-c', 'question-d'].sort())

  // Navigate a student to the served choice-shuffle-true item, waiting for
  // each question-counter transition before clicking Next again (rather
  // than firing every click back to back, which risks double-posting an
  // answer against the same in-flight item).
  async function goToShuffledItem(studentPage: typeof studentA, body: { items: { identifier: string; path: string; xml: string }[] }) {
    const totalItems = body.items.length
    const targetIndex = body.items.findIndex((item) => item.identifier === 'choice-shuffle-true')
    expect(targetIndex).toBeGreaterThanOrEqual(0)
    await expect(studentPage.getByTestId('quiz-question')).toContainText(`Question 1 of ${totalItems}`)
    for (let i = 0; i < targetIndex; i++) {
      await studentPage.getByRole('button', { name: /^next$/i }).click()
      await expect(studentPage.getByTestId('quiz-question')).toContainText(`Question ${i + 2} of ${totalItems}`)
    }
    return body.items[targetIndex].xml
  }

  // Extracts each qti-simple-choice's label text, in the SERVED XML's own
  // order — this is what the DoD's "the shuffled choices actually appear,
  // in the served order" is checked against, independent of how the
  // player happens to lay out its DOM.
  function servedChoiceLabelsInOrder(xml: string): string[] {
    return Array.from(xml.matchAll(/<qti-simple-choice[^>]*>([^<]*)<\/qti-simple-choice>/g), (m) => m[1])
  }

  async function assertRendersInServedOrder(studentPage: typeof studentA, servedXml: string) {
    await studentPage.waitForSelector('[data-testid="quiz-question"] input[type="radio"]')
    const inputs = studentPage.locator('[data-testid="quiz-question"] input[type="radio"]')
    // One real radio input per authored choice — no rendering breakage
    // from the round-tripped XML.
    await expect(inputs).toHaveCount(4)

    const labels = servedChoiceLabelsInOrder(servedXml)
    expect(labels).toHaveLength(4)
    const rendered = await studentPage.getByTestId('quiz-question').innerText()
    // The four labels ("Option A".."Option D") are distinct strings, so
    // their positions in the rendered text can't collide — asserting
    // strictly increasing indexOf proves they appear in the served order.
    const positions = labels.map((label) => rendered.indexOf(label))
    for (const position of positions) expect(position).toBeGreaterThanOrEqual(0)
    for (let i = 1; i < positions.length; i++) expect(positions[i]).toBeGreaterThan(positions[i - 1])
  }

  const servedXmlA = await goToShuffledItem(studentA, bodyA)
  await assertRendersInServedOrder(studentA, servedXmlA)

  const servedXmlB = await goToShuffledItem(studentB, bodyB)
  await assertRendersInServedOrder(studentB, servedXmlB)

  await contextA.close()
  await contextB.close()
})

// QUIZ-RANDOM-QUESTION-ORDER-001/QUIZ-RANDOM-ANSWER-ORDER-001: real-browser
// coverage of the trainer-facing toggles themselves (checking the "force
// shuffle answers" checkbox before Start, not just sending the field
// directly to the API as the tech PBI's own route tests do) — forces
// shuffling on the choice-shuffle-false item, which is authored
// shuffle="false" and would otherwise never shuffle, proving the toggle's
// wiring end to end. Two separate browser contexts again, each getting its
// own independently-generated forced order.
test('checking "force shuffle answers" before Start shuffles an authored shuffle="false" item per student', async ({ page, browser }) => {
  await signUpAndLogIn(page, uniqueEmail('e2e-force-shuffle'), 'correct-horse-1')

  await page.getByRole('button', { name: /new course/i }).click()
  await page.getByLabel('Course name').fill('E2E Force Shuffle Course')
  await page.getByRole('button', { name: /^create$/i }).click()
  await page.getByText('E2E Force Shuffle Course').click()

  await page.locator('input[data-testid="upload-file-input"]').setInputFiles({
    name: 'shuffle-quiz.zip',
    mimeType: 'application/zip',
    buffer: buildShufflePackageZip(),
  })
  await page.getByRole('button', { name: /create session/i }).click()
  await expect(page).toHaveURL(/\/quiz-sessions\/[^/]+$/)

  const takeUrl = await page.getByRole('link', { name: /\/take$/ }).innerText()

  // when: the trainer explicitly checks "force shuffle answers" (leaving
  // "force shuffle questions" off) before starting
  await page.getByLabel(/force shuffle answers/i).check()
  await expect(page.getByLabel(/force shuffle answers/i)).toBeChecked()
  await expect(page.getByLabel(/force shuffle questions/i)).not.toBeChecked()
  await page.getByRole('button', { name: /^start$/i }).click()

  const contextA = await browser.newContext()
  const contextB = await browser.newContext()
  const studentA = await contextA.newPage()
  const studentB = await contextB.newPage()

  const [itemsResponseA] = await Promise.all([studentA.waitForResponse((res) => /\/connections\/[^/]+\/items$/.test(res.url())), studentA.goto(takeUrl)])
  const [itemsResponseB] = await Promise.all([studentB.waitForResponse((res) => /\/connections\/[^/]+\/items$/.test(res.url())), studentB.goto(takeUrl)])

  const bodyA = await itemsResponseA.json()
  const bodyB = await itemsResponseB.json()

  function choiceIdentifiersOf(body: { items: { identifier: string; xml: string }[] }, identifier: string): string[] {
    const item = body.items.find((i) => i.identifier === identifier)
    return Array.from(item!.xml.matchAll(/<qti-simple-choice[^>]*identifier="([^"]+)"/g), (m) => m[1])
  }

  // then: the authored shuffle="false" item is still reordered for both
  // students — the force-shuffle-answers toggle overrode its own
  // attribute — while carrying the exact same set of choice identifiers
  // (nothing lost/duplicated), each independently generated.
  const authoredOrder = ['csf_choice_a', 'csf_choice_b', 'csf_choice_c', 'csf_choice_d']
  const servedA = choiceIdentifiersOf(bodyA, 'choice-shuffle-false')
  const servedB = choiceIdentifiersOf(bodyB, 'choice-shuffle-false')
  expect(new Set(servedA)).toEqual(new Set(authoredOrder))
  expect(new Set(servedB)).toEqual(new Set(authoredOrder))
  // At least one of the two (independently generated, real-RNG) orders
  // differs from the authored one — both coincidentally matching identity
  // has probability 1/24 * 1/24, negligible flake risk — proving the
  // toggle actually forced a reorder rather than leaving the
  // shuffle="false" item untouched.
  const bothIdentity = JSON.stringify(servedA) === JSON.stringify(authoredOrder) && JSON.stringify(servedB) === JSON.stringify(authoredOrder)
  expect(bothIdentity).toBe(false)

  await contextA.close()
  await contextB.close()
})
