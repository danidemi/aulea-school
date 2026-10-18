import { describe, expect, it } from 'vitest'
import { AllowlistError, evaluate, parseAllowlist } from './allowlist.js'
import type { AllowlistEntry, Finding } from './types.js'

const finding = (over: Partial<Finding> = {}): Finding => ({
  check: 'npm-audit:server',
  id: 'GHSA-aaaa-bbbb-cccc',
  package: 'left-pad',
  severity: 'high',
  dependency: 'prod',
  fixAvailable: false,
  title: 't',
  url: null,
  ...over,
})

const entry = (over: Partial<AllowlistEntry> = {}): AllowlistEntry => ({
  id: 'GHSA-aaaa-bbbb-cccc',
  package: 'left-pad',
  reason: 'no fix, not reachable',
  expires: '2027-04-18',
  ...over,
})

const today = new Date('2026-10-18T10:00:00Z')

describe('evaluate', () => {
  it('given a high prod finding not in the allowlist, when evaluated, then it is new', () => {
    expect(evaluate([finding()], [], today)[0].status).toBe('new')
  })

  it('given a critical prod finding not in the allowlist, when evaluated, then it is new', () => {
    expect(evaluate([finding({ severity: 'critical' })], [], today)[0].status).toBe('new')
  })

  it('given a high prod finding with an active entry, when evaluated, then it is allowed with the reason', () => {
    const [result] = evaluate([finding()], [entry()], today)

    expect(result).toMatchObject({ status: 'allowed', reason: 'no fix, not reachable', expires: '2027-04-18' })
  })

  it('given an entry that expired yesterday, when evaluated, then the finding is expired and fails again', () => {
    const [result] = evaluate([finding()], [entry({ expires: '2026-10-17' })], today)

    expect(result.status).toBe('expired')
  })

  it('given an entry that expires today, when evaluated, then it is still accepted', () => {
    const [result] = evaluate([finding()], [entry({ expires: '2026-10-18' })], today)

    expect(result.status).toBe('allowed')
  })

  it('given an entry for the same id but another package, when evaluated, then it does not match', () => {
    const [result] = evaluate([finding()], [entry({ package: 'other' })], today)

    expect(result.status).toBe('new')
  })

  it('given a moderate prod finding, when evaluated, then it is only reported', () => {
    expect(evaluate([finding({ severity: 'moderate' })], [], today)[0].status).toBe('reported')
  })

  it('given a high dev finding, when evaluated, then it is only reported and never blocks', () => {
    expect(evaluate([finding({ dependency: 'dev' })], [], today)[0].status).toBe('reported')
  })

  it('given a dev finding with an expired entry, when evaluated, then it stays reported', () => {
    const [result] = evaluate([finding({ dependency: 'dev' })], [entry({ expires: '2020-01-01' })], today)

    expect(result.status).toBe('reported')
  })
})

describe('parseAllowlist', () => {
  it('given a valid file, when parsed, then the entries are returned', () => {
    expect(parseAllowlist(JSON.stringify({ entries: [entry()] }))).toEqual([entry()])
  })

  it.each(['id', 'package', 'reason', 'expires'] as const)('given an entry without %s, when parsed, then it throws', (field) => {
    const bad = { ...entry(), [field]: '' }

    expect(() => parseAllowlist(JSON.stringify({ entries: [bad] }))).toThrow(AllowlistError)
  })

  it('given a bad expiry date, when parsed, then it throws', () => {
    const bad = entry({ expires: '18/04/2027' })

    expect(() => parseAllowlist(JSON.stringify({ entries: [bad] }))).toThrow('invalid "expires"')
  })

  it('given text that is not JSON, when parsed, then it throws', () => {
    expect(() => parseAllowlist('nope')).toThrow(AllowlistError)
  })
})
