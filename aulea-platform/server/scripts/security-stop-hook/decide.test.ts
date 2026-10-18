import { describe, expect, it, vi } from 'vitest'
import { decide, isRelevantChange, type CheckResult } from './decide.js'

const relevant = ['aulea-platform/server/src/routes/quiz.ts']

const run = (over: { stopHookActive?: boolean; changedFiles?: string[]; result?: CheckResult }) => {
  const runCheck = vi.fn(async () => over.result ?? ({ kind: 'ran', exitCode: 0, output: '' } as CheckResult))
  const decision = decide({
    stopHookActive: over.stopHookActive ?? false,
    changedFiles: over.changedFiles ?? relevant,
    runCheck,
  })
  return { decision, runCheck }
}

describe('decide', () => {
  it('given no relevant change, when the turn ends, then it allows the stop without running the check', async () => {
    const { decision, runCheck } = run({ changedFiles: ['aulea-platform/client/src/App.tsx', 'README.md'] })

    expect(await decision).toEqual({ exitCode: 0, message: '' })
    expect(runCheck).not.toHaveBeenCalled()
  })

  it('given no changed files at all, when the turn ends, then it allows the stop', async () => {
    const { decision, runCheck } = run({ changedFiles: [] })

    expect((await decision).exitCode).toBe(0)
    expect(runCheck).not.toHaveBeenCalled()
  })

  it('given a relevant change and new findings, when the turn ends, then it blocks with the findings and the guidance', async () => {
    const { decision } = run({ result: { kind: 'ran', exitCode: 1, output: 'NEW multer GHSA-xxxx high\n' } })

    const { exitCode, message } = await decision

    expect(exitCode).toBe(2)
    expect(message).toContain('NEW multer GHSA-xxxx high')
    expect(message).toContain('Do NOT run `npm audit fix --force`')
    expect(message).toContain('allowlist.json')
    expect(message).toContain('expiry date')
    expect(message).toContain('report')
  })

  it('given a relevant change and a clean result, when the turn ends, then it allows the stop silently', async () => {
    const { decision, runCheck } = run({ result: { kind: 'ran', exitCode: 0, output: 'clean' } })

    expect(await decision).toEqual({ exitCode: 0, message: '' })
    expect(runCheck).toHaveBeenCalledOnce()
  })

  it('given stop_hook_active is set and new findings exist, when the turn ends, then it does not block a second time', async () => {
    const { decision, runCheck } = run({
      stopHookActive: true,
      result: { kind: 'ran', exitCode: 1, output: 'NEW multer' },
    })

    expect(await decision).toEqual({ exitCode: 0, message: '' })
    expect(runCheck).not.toHaveBeenCalled()
  })

  it('given the script cannot run (exit 2), when the turn ends, then it warns and does not block', async () => {
    const { decision } = run({ result: { kind: 'ran', exitCode: 2, output: 'npm audit: network down' } })

    const { exitCode, message } = await decision

    expect(exitCode).toBe(0)
    expect(message).toContain('could not run')
    expect(message).toContain('network down')
  })

  it('given the script is unavailable (cannot be started), when the turn ends, then it warns and does not block', async () => {
    const { decision } = run({ result: { kind: 'unavailable', reason: 'spawn ENOENT' } })

    const { exitCode, message } = await decision

    expect(exitCode).toBe(0)
    expect(message).toContain('could not run')
    expect(message).toContain('spawn ENOENT')
  })
})

describe('isRelevantChange', () => {
  it.each([
    'aulea-platform/server/package.json',
    'aulea-platform/client/package.json',
    'aulea-platform/server/package-lock.json',
    'aulea-platform/client/package-lock.json',
    'aulea-platform/Dockerfile',
    'aulea-platform/docker/Dockerfile.dev',
    'aulea-platform/server/src/index.ts',
    'aulea-platform/server/src/routes/deep/file.ts',
  ])('given %s, when checked, then it is relevant', (path) => {
    expect(isRelevantChange(path)).toBe(true)
  })

  it.each([
    'aulea-platform/client/src/App.tsx',
    'aulea-platform/server/scripts/db-seed.ts',
    'aulea-platform/README.md',
    'agile/aulea-platform/active_sprint/x.md',
    'other/package.json',
  ])('given %s, when checked, then it is not relevant', (path) => {
    expect(isRelevantChange(path)).toBe(false)
  })
})
