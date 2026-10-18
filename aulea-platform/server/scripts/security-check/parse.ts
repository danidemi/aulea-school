import type { DependencyScope, Finding, Severity } from './types.js'

const SEVERITIES: Severity[] = ['info', 'low', 'moderate', 'high', 'critical']

interface AuditVia {
  source?: number
  name?: string
  title?: string
  url?: string
  severity?: string
}

interface AuditVulnerability {
  name: string
  fixAvailable?: boolean | object
  via?: Array<string | AuditVia>
}

interface AuditReport {
  vulnerabilities?: Record<string, AuditVulnerability>
  message?: string
  error?: { code?: string; summary?: string }
}

export class AuditParseError extends Error {}

/** Parses the stdout of `npm audit --json`. Throws AuditParseError when it is not an audit report. */
export function parseAuditReport(stdout: string): AuditReport {
  let report: AuditReport
  try {
    report = JSON.parse(stdout) as AuditReport
  } catch {
    throw new AuditParseError('npm audit did not return JSON')
  }
  if (report.error) {
    throw new AuditParseError(report.error.summary || report.message || report.error.code || 'npm audit reported an error')
  }
  if (!report.vulnerabilities || typeof report.vulnerabilities !== 'object') {
    throw new AuditParseError('npm audit JSON has no "vulnerabilities" object')
  }
  return report
}

function advisoryId(via: AuditVia): string {
  const ghsa = via.url?.match(/GHSA-[a-z0-9-]+/i)?.[0]
  return ghsa ?? String(via.source)
}

/**
 * One finding per advisory and package. `via` entries that are plain strings only name a parent
 * package in the dependency chain; they are not advisories and are skipped.
 */
export function findingsFromAudit(report: AuditReport, check: string, dependency: DependencyScope): Finding[] {
  const found = new Map<string, Finding>()
  for (const vuln of Object.values(report.vulnerabilities ?? {})) {
    for (const via of vuln.via ?? []) {
      if (typeof via === 'string' || via.source === undefined || !via.name) continue
      const severity = SEVERITIES.includes(via.severity as Severity) ? (via.severity as Severity) : 'info'
      const finding: Finding = {
        check,
        id: advisoryId(via),
        package: via.name,
        severity,
        dependency,
        fixAvailable: vuln.fixAvailable !== false && vuln.fixAvailable !== undefined,
        title: via.title ?? '',
        url: via.url ?? null,
      }
      found.set(`${finding.id}|${finding.package}`, finding)
    }
  }
  return [...found.values()]
}

/** Prod findings, plus the findings that only the full audit shows (dev-only). */
export function mergeScopes(prod: Finding[], all: Finding[]): Finding[] {
  const prodKeys = new Set(prod.map((f) => `${f.id}|${f.package}`))
  const devOnly = all
    .filter((f) => !prodKeys.has(`${f.id}|${f.package}`))
    .map((f): Finding => ({ ...f, dependency: 'dev' }))
  return [...prod, ...devOnly]
}
