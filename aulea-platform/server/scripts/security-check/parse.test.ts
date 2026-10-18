import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { AuditParseError, findingsFromAudit, mergeScopes, parseAuditReport } from './parse.js'

const fixture = (name: string) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8')

describe('parseAuditReport', () => {
  it('given text that is not JSON, when parsed, then it throws AuditParseError', () => {
    expect(() => parseAuditReport('npm ERR! network')).toThrow(AuditParseError)
  })

  it('given an npm error object (e.g. no network), when parsed, then it throws with the npm summary', () => {
    const stdout = JSON.stringify({ error: { code: 'ENOTFOUND', summary: 'request to registry failed' } })
    expect(() => parseAuditReport(stdout)).toThrow('request to registry failed')
  })

  it('given an npm error with an empty summary (registry unreachable), when parsed, then the top-level message is used', () => {
    const stdout = JSON.stringify({ message: 'connect ECONNREFUSED 127.0.0.1:9', error: { summary: '', detail: '' } })
    expect(() => parseAuditReport(stdout)).toThrow('connect ECONNREFUSED')
  })

  it('given JSON without vulnerabilities, when parsed, then it throws', () => {
    expect(() => parseAuditReport('{}')).toThrow(AuditParseError)
  })
})

describe('findingsFromAudit', () => {
  it('given a recorded audit, when converted, then each advisory becomes one finding with its GHSA id', () => {
    const findings = findingsFromAudit(parseAuditReport(fixture('audit-prod.json')), 'npm-audit:server', 'prod')

    expect(findings.map((f) => [f.id, f.package, f.severity])).toEqual([
      ['GHSA-xcpc-8h2w-3j85', 'adm-zip', 'high'],
      ['GHSA-wrjc-x8rr-h8h6', 'react-router', 'moderate'],
    ])
  })

  it('given a chain node that only names a parent package, when converted, then it adds no finding', () => {
    const findings = findingsFromAudit(parseAuditReport(fixture('audit-prod.json')), 'c', 'prod')

    expect(findings.some((f) => f.package === 'react-router-dom')).toBe(false)
  })

  it('given an advisory without a GHSA url, when converted, then the numeric source is the id', () => {
    const report = parseAuditReport(
      JSON.stringify({
        vulnerabilities: {
          x: { name: 'x', via: [{ source: 99, name: 'x', title: 't', severity: 'low' }], fixAvailable: false },
        },
      }),
    )

    const [finding] = findingsFromAudit(report, 'c', 'prod')

    expect(finding).toMatchObject({ id: '99', fixAvailable: false, url: null })
  })
})

describe('mergeScopes', () => {
  it('given a full audit with an extra advisory, when merged with the prod audit, then the extra one is dev', () => {
    const prod = findingsFromAudit(parseAuditReport(fixture('audit-prod.json')), 'c', 'prod')
    const all = findingsFromAudit(parseAuditReport(fixture('audit-all.json')), 'c', 'prod')

    const merged = mergeScopes(prod, all)

    expect(merged.find((f) => f.package === 'esbuild')?.dependency).toBe('dev')
    expect(merged.find((f) => f.package === 'adm-zip')?.dependency).toBe('prod')
    expect(merged.filter((f) => f.package === 'adm-zip')).toHaveLength(1)
  })
})
