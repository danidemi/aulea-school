import { chromium } from '@playwright/test'

const browser = await chromium.launch()
const page = await browser.newPage()
const consoleErrors = []
page.on('pageerror', (err) => consoleErrors.push(`pageerror: ${err.message}`))
page.on('console', (msg) => {
  if (msg.type() === 'error') consoleErrors.push(`console.error: ${msg.text()}`)
})

await page.goto('http://localhost:5183/')
await page.waitForSelector('[data-testid="test-sequence-demo"] qti-assessment-item-player, [data-testid="test-sequence-demo"]')
await page.screenshot({ path: 'screenshots/01-item1-single-choice.png', fullPage: true })

// item 1: single-choice-basic — max-choices=1, should render radios.
const item1Inputs = await page.locator('[data-testid="test-sequence-demo"] input').all()
console.log('item1 input types:', await Promise.all(item1Inputs.map((i) => i.getAttribute('type'))))
await item1Inputs[1]?.check().catch(() => {}) // choice_b (Paris)
await page.screenshot({ path: 'screenshots/02-item1-selected.png', fullPage: true })

await page.click('[data-testid="test-sequence-next"]')
await page.waitForTimeout(300)
await page.screenshot({ path: 'screenshots/03-item2-multiple-choice.png', fullPage: true })

// item 2: multiple-choice-basic — max-choices=0, should render checkboxes.
const item2Inputs = await page.locator('[data-testid="test-sequence-demo"] input').all()
console.log('item2 input types:', await Promise.all(item2Inputs.map((i) => i.getAttribute('type'))))
await item2Inputs[0]?.check().catch(() => {}) // choice_a (2)
await item2Inputs[2]?.check().catch(() => {}) // choice_c (7)
await page.screenshot({ path: 'screenshots/04-item2-selected.png', fullPage: true })

await page.click('[data-testid="test-sequence-next"]')
await page.waitForTimeout(300)
await page.screenshot({ path: 'screenshots/05-submitted.png', fullPage: true })

const resultText = await page.locator('[data-testid="test-sequence-result"]').textContent()
console.log('=== captured responses ===')
console.log(resultText)

console.log('=== console/page errors ===')
console.log(consoleErrors.length ? consoleErrors.join('\n') : '(none)')

await browser.close()
