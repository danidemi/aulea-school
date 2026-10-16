/**
 * BRANDING-001: renders the PNG icons from `public/icon.svg` (and the full-bleed
 * variant for the apple-touch / maskable icons) with Playwright, then packs
 * `public/favicon.ico` (16/32/48, PNG payloads). No extra dependency.
 * Run from `client/`: `npm run build:icons` (Node runs the .ts file directly).
 */
import { chromium } from '@playwright/test'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const rounded = readFileSync(join(root, 'public/icon.svg'), 'utf8')
const fullBleed = readFileSync(join(root, 'scripts/icon-full-bleed.svg'), 'utf8')

async function main() {
  const browser = await chromium.launch()
  const page = await browser.newPage()
  async function render(svg: string, size: number): Promise<Buffer> {
    await page.setViewportSize({ width: 600, height: 600 }) // tiny viewports are clamped by Chromium
    await page.setContent(
      `<style>html,body{margin:0;background:transparent}svg{display:block}</style>${svg.replace(/width="\d+" height="\d+"/, `width="${size}" height="${size}"`)}`,
    )
    return page.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } })
  }

  writeFileSync(join(root, 'public/apple-touch-icon.png'), await render(fullBleed, 180))
  writeFileSync(join(root, 'public/icon-192.png'), await render(rounded, 192))
  writeFileSync(join(root, 'public/icon-512.png'), await render(rounded, 512))
  writeFileSync(join(root, 'public/icon-512-maskable.png'), await render(fullBleed, 512))

  const sizes = [16, 32, 48]
  const pngs: Buffer[] = []
  for (const s of sizes) pngs.push(await render(rounded, s)) // sequential: one shared page
  const header = Buffer.alloc(6)
  header.writeUInt16LE(1, 2) // type: icon
  header.writeUInt16LE(sizes.length, 4)
  const entries = Buffer.alloc(16 * sizes.length)
  let offset = header.length + entries.length
  sizes.forEach((s, i) => {
    const e = i * 16
    entries.writeUInt8(s, e) // width
    entries.writeUInt8(s, e + 1) // height
    entries.writeUInt16LE(1, e + 4) // planes
    entries.writeUInt16LE(32, e + 6) // bits per pixel
    entries.writeUInt32LE(pngs[i].length, e + 8)
    entries.writeUInt32LE(offset, e + 12)
    offset += pngs[i].length
  })
  writeFileSync(join(root, 'public/favicon.ico'), Buffer.concat([header, entries, ...pngs]))
  await browser.close()
}

main()
