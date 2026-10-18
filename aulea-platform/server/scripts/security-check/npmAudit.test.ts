import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { npmAuditCheck, type AuditExec } from './npmAudit.js'

const fixture = (name: string) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8')

describe('npmAuditCheck', () => {
  it('given prod and full audits, when run, then dev-only findings are marked dev', async () => {
    const exec: AuditExec = async (_cwd, omitDev) => fixture(omitDev ? 'audit-prod.json' : 'audit-all.json')

    const outcome = await npmAuditCheck('server', '/x', exec).run()

    expect(outcome.kind).toBe('findings')
    if (outcome.kind === 'findings') {
      expect(outcome.findings.find((x) => x.package === 'esbuild')?.dependency).toBe('dev')
      expect(outcome.findings.find((x) => x.package === 'adm-zip')?.dependency).toBe('prod')
    }
  })

  it('given npm cannot start, when run, then it could not run', async () => {
    const exec: AuditExec = async () => {
      throw new Error('spawn npm ENOENT')
    }

    expect(await npmAuditCheck('server', '/x', exec).run()).toEqual({
      kind: 'could-not-run',
      reason: 'spawn npm ENOENT',
    })
  })

  it('given npm returns an error report (no network), when run, then it could not run with npm summary', async () => {
    const exec: AuditExec = async () => JSON.stringify({ error: { code: 'ENOTFOUND', summary: 'registry unreachable' } })

    expect(await npmAuditCheck('client', '/x', exec).run()).toEqual({
      kind: 'could-not-run',
      reason: 'registry unreachable',
    })
  })
})
