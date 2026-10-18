import { readFileSync } from 'node:fs'
import type { AllowlistEntry, EvaluatedFinding, Finding } from './types.js'

export class AllowlistError extends Error {}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export function parseAllowlist(text: string): AllowlistEntry[] {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new AllowlistError('allowlist is not valid JSON')
  }
  const entries = (data as { entries?: unknown }).entries
  if (!Array.isArray(entries)) throw new AllowlistError('allowlist needs an "entries" array')
  return entries.map((raw, i) => {
    const e = raw as Partial<AllowlistEntry>
    for (const field of ['id', 'package', 'reason', 'expires'] as const) {
      if (typeof e[field] !== 'string' || e[field] === '') {
        throw new AllowlistError(`allowlist entry ${i} is missing "${field}"`)
      }
    }
    if (!ISO_DATE.test(e.expires!) || Number.isNaN(Date.parse(e.expires!))) {
      throw new AllowlistError(`allowlist entry ${i} has an invalid "expires" (use YYYY-MM-DD)`)
    }
    return { id: e.id!, package: e.package!, reason: e.reason!, expires: e.expires! }
  })
}

export function loadAllowlist(path: string): AllowlistEntry[] {
  let text: string
  try {
    text = readFileSync(path, 'utf8')
  } catch {
    throw new AllowlistError(`cannot read allowlist at ${path}`)
  }
  return parseAllowlist(text)
}

/** Only high and critical findings in production dependencies fail the check (ADR-0016). */
export function isBlocking(finding: Finding): boolean {
  return finding.dependency === 'prod' && (finding.severity === 'high' || finding.severity === 'critical')
}

/** An entry is accepted through the end of its `expires` day (UTC). */
function isExpired(entry: AllowlistEntry, now: Date): boolean {
  return now.getTime() >= Date.parse(entry.expires) + 24 * 60 * 60 * 1000
}

export function evaluate(findings: Finding[], allowlist: AllowlistEntry[], now: Date): EvaluatedFinding[] {
  return findings.map((finding): EvaluatedFinding => {
    const entry = allowlist.find((e) => e.id === finding.id && e.package === finding.package)
    const active = entry !== undefined && !isExpired(entry, now)
    if (!isBlocking(finding)) {
      return active
        ? { ...finding, status: 'allowed', reason: entry.reason, expires: entry.expires }
        : { ...finding, status: 'reported' }
    }
    if (!entry) return { ...finding, status: 'new' }
    return {
      ...finding,
      status: active ? 'allowed' : 'expired',
      reason: entry.reason,
      expires: entry.expires,
    }
  })
}
