import { describe, expect, it } from 'vitest'
import { buildSummary, exitCodeFor, formatHuman, type CheckStatus } from './report.js'
import type { EvaluatedFinding } from './types.js'

const ok: CheckStatus = { name: 'npm-audit:server', status: 'ok' }
const broken: CheckStatus = { name: 'npm-audit:client', status: 'could-not-run', error: 'offline' }
const f = (status: EvaluatedFinding['status']): EvaluatedFinding => ({
  check: 'npm-audit:server',
  id: 'GHSA-aaaa-bbbb-cccc',
  package: 'left-pad',
  severity: 'high',
  dependency: 'prod',
  fixAvailable: false,
  title: 't',
  url: null,
  status,
})
const now = new Date('2026-10-18T10:00:00Z')

describe('exitCodeFor', () => {
  it('given only allowed and reported findings, when computed, then the exit code is 0', () => {
    expect(exitCodeFor([ok], [f('allowed'), f('reported')])).toBe(0)
  })

  it('given a new finding, when computed, then the exit code is 1', () => {
    expect(exitCodeFor([ok], [f('new')])).toBe(1)
  })

  it('given an expired finding, when computed, then the exit code is 1', () => {
    expect(exitCodeFor([ok], [f('expired')])).toBe(1)
  })

  it('given a check that could not run and no findings, when computed, then the exit code is 2', () => {
    expect(exitCodeFor([ok, broken], [])).toBe(2)
  })

  it('given a new finding and a check that could not run, when computed, then findings win with 1', () => {
    expect(exitCodeFor([ok, broken], [f('new')])).toBe(1)
  })
})

describe('buildSummary', () => {
  it('given mixed findings, when summarised, then the JSON shape has version, result and counts', () => {
    const summary = buildSummary([ok], [f('new'), f('allowed'), f('reported')], now)

    expect(summary).toMatchObject({
      version: 1,
      generatedAt: '2026-10-18T10:00:00.000Z',
      exitCode: 1,
      result: 'fail',
      counts: { new: 1, expired: 0, allowed: 1, reported: 1 },
    })
  })
})

describe('formatHuman', () => {
  it('given a new finding, when formatted, then it is listed under NEW and the verdict is FAIL', () => {
    const text = formatHuman(buildSummary([ok], [f('new')], now))

    expect(text).toContain('NEW findings (fail) (1)')
    expect(text).toContain('FAIL: new findings (exit 1)')
  })

  it('given a check that could not run, when formatted, then the reason is shown', () => {
    const text = formatHuman(buildSummary([broken], [], now))

    expect(text).toContain('COULD NOT RUN: npm-audit:client: offline')
    expect(text).toContain('(exit 2)')
  })
})
