import {
  EXIT_CLEAN,
  EXIT_COULD_NOT_RUN,
  EXIT_NEW_FINDINGS,
  type EvaluatedFinding,
  type FindingStatus,
} from './types.js'

export interface CheckStatus {
  name: string
  status: 'ok' | 'could-not-run'
  error?: string
}

export interface Summary {
  version: 1
  generatedAt: string
  exitCode: number
  result: 'pass' | 'fail' | 'error'
  checks: CheckStatus[]
  counts: Record<FindingStatus, number>
  findings: EvaluatedFinding[]
}

/** New or expired findings win over "could not run": a known failure is not hidden by a flaky tool. */
export function exitCodeFor(checks: CheckStatus[], findings: EvaluatedFinding[]): number {
  if (findings.some((f) => f.status === 'new' || f.status === 'expired')) return EXIT_NEW_FINDINGS
  if (checks.some((c) => c.status === 'could-not-run')) return EXIT_COULD_NOT_RUN
  return EXIT_CLEAN
}

export function buildSummary(checks: CheckStatus[], findings: EvaluatedFinding[], now: Date): Summary {
  const exitCode = exitCodeFor(checks, findings)
  const counts: Record<FindingStatus, number> = { new: 0, expired: 0, allowed: 0, reported: 0 }
  for (const f of findings) counts[f.status] += 1
  return {
    version: 1,
    generatedAt: now.toISOString(),
    exitCode,
    result: exitCode === EXIT_CLEAN ? 'pass' : exitCode === EXIT_NEW_FINDINGS ? 'fail' : 'error',
    checks,
    counts,
    findings,
  }
}

function line(f: EvaluatedFinding): string {
  const fix = f.fixAvailable ? 'fix available' : 'no fix'
  const extra = f.status === 'allowed' || f.status === 'expired' ? ` | ${f.status} until ${f.expires}: ${f.reason}` : ''
  return `  [${f.severity}] ${f.package} ${f.id} (${f.check}, ${f.dependency}, ${fix})${extra}`
}

export function formatHuman(summary: Summary): string {
  const out: string[] = []
  const section = (title: string, status: FindingStatus) => {
    const rows = summary.findings.filter((f) => f.status === status)
    if (rows.length === 0) return
    out.push(`${title} (${rows.length})`, ...rows.map(line), '')
  }
  section('NEW findings (fail)', 'new')
  section('EXPIRED allowlist entries (fail)', 'expired')
  section('Allowlisted findings (accepted)', 'allowed')
  section('Reported only (not blocking)', 'reported')
  for (const c of summary.checks.filter((c) => c.status === 'could-not-run')) {
    out.push(`COULD NOT RUN: ${c.name}: ${c.error}`)
  }
  const verdict = { pass: 'PASS', fail: 'FAIL: new findings', error: 'ERROR: a check could not run' }[summary.result]
  out.push(`Security check: ${verdict} (exit ${summary.exitCode})`)
  return out.join('\n')
}
