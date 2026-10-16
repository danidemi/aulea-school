import { test, expect } from '@playwright/test'
import { signUpAndLogIn, uniqueEmail } from './helpers'

// BRANDING-001: title, icon links (each answering 200 with the right content type), the
// Wordmark/Tagline placement, and the screenshots attached to the PBI. The app has no dark
// theme (pinned to light), so the dark shots use emulated prefers-color-scheme and look the same.
const EVIDENCE_DIR = '../../agile/aulea-platform/active_sprint/assets/BRANDING-001'

const ICONS: Array<{ rel: string; href: string; type: string }> = [
  { rel: 'icon', href: '/favicon.ico', type: 'image/x-icon|image/vnd.microsoft.icon' },
  { rel: 'icon', href: '/icon.svg', type: 'image/svg\\+xml' },
  { rel: 'apple-touch-icon', href: '/apple-touch-icon.png', type: 'image/png' },
  { rel: 'manifest', href: '/site.webmanifest', type: 'application/manifest\\+json|application/json' },
]

test('has the Aulea.school title, the icon links, and every linked icon answers 200', async ({ page, request }) => {
  await page.goto('/')
  await expect(page).toHaveTitle('Aulea.school')
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#1E2A44')

  for (const icon of ICONS) {
    await expect(page.locator(`link[rel="${icon.rel}"][href="${icon.href}"]`)).toHaveCount(1)
    const response = await request.get(icon.href)
    expect(response.status(), icon.href).toBe(200)
    expect(response.headers()['content-type'], icon.href).toMatch(new RegExp(icon.type))
  }

  // the manifest names the product and its icons, which also answer 200
  const manifest = await (await request.get('/site.webmanifest')).json()
  expect(manifest.name).toBe('Aulea.school')
  for (const icon of manifest.icons) {
    const response = await request.get(icon.src)
    expect(response.status(), icon.src).toBe(200)
    expect(response.headers()['content-type'], icon.src).toBe('image/png')
  }
})

test('shows the Wordmark in the header, and the Tagline only on the home and login pages', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('banner')).toContainText('Aulea.school')
  await expect(page.getByRole('banner')).not.toContainText(/learning platform/i)
  await expect(page.getByText(/ai authoring for human teachers/i)).toHaveCount(1)

  await page.goto('/login')
  await expect(page.getByText(/ai authoring for human teachers/i)).toBeVisible()

  await page.goto('/signup')
  await expect(page.getByText(/ai authoring for human teachers/i)).toHaveCount(0)
})

const VIEWPORTS = [
  { name: 'desktop', size: { width: 1280, height: 720 } },
  { name: 'mobile', size: { width: 375, height: 667 } },
] as const

for (const scheme of ['light', 'dark'] as const) {
  for (const viewport of VIEWPORTS) {
    test(`screenshots: header on login and a signed-in page (${scheme}, ${viewport.name})`, async ({ page }) => {
      await page.setViewportSize(viewport.size)
      await page.emulateMedia({ colorScheme: scheme })

      await page.goto('/login')
      await expect(page.getByRole('banner')).toContainText('Aulea.school')
      await page.screenshot({ path: `${EVIDENCE_DIR}/login-${scheme}-${viewport.name}.png` })

      await signUpAndLogIn(page, uniqueEmail('e2e-branding'), 'correct-horse-1')
      await expect(page).toHaveURL(/\/courses/)
      await expect(page.getByRole('banner')).toContainText('Aulea.school')
      await page.screenshot({ path: `${EVIDENCE_DIR}/courses-${scheme}-${viewport.name}.png` })

      // no horizontal scrolling at the narrow width
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
      expect(overflow).toBeLessThanOrEqual(0)
    })
  }
}

test('screenshot: the 16 px and 32 px frames of the served favicon.ico, on a tab-like strip', async ({ page, request }) => {
  const ico = await (await request.get('/favicon.ico')).body()
  const count = ico.readUInt16LE(4)
  const frames: Record<number, string> = {}
  for (let i = 0; i < count; i++) {
    const entry = 6 + i * 16
    const size = ico.readUInt8(entry) || 256
    const length = ico.readUInt32LE(entry + 8)
    const offset = ico.readUInt32LE(entry + 12)
    frames[size] = `data:image/png;base64,${ico.subarray(offset, offset + length).toString('base64')}`
  }
  expect(Object.keys(frames).map(Number).sort((a, b) => a - b)).toEqual([16, 32, 48])

  await page.setViewportSize({ width: 420, height: 120 })
  await page.setContent(
    `<body style="margin:0;padding:16px;background:#dee1e6;font:13px sans-serif;display:flex;gap:24px">
       <div style="display:flex;align-items:center;gap:8px;background:#fff;padding:8px 12px;border-radius:8px"><img src="${frames[16]}" width="16" height="16"> Aulea.school</div>
       <div style="display:flex;align-items:center;gap:8px;background:#fff;padding:8px 12px;border-radius:8px"><img src="${frames[32]}" width="32" height="32"> 32 px</div>
     </body>`,
  )
  await page.screenshot({ path: `${EVIDENCE_DIR}/favicon-16-32.png` })
})
