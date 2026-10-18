// SEC-CHECK-001 / ADR-0016: shared shapes. The JSON summary and the exit codes
// are a contract for SEC-HOOK-001, SEC-CI-001 and the later scanners.

export type Severity = 'info' | 'low' | 'moderate' | 'high' | 'critical'

export type DependencyScope = 'prod' | 'dev'

export interface Finding {
  /** Name of the check that produced it, e.g. `npm-audit:server`. */
  check: string
  /** Advisory id (GHSA-...), or the numeric npm advisory id when no GHSA url exists. */
  id: string
  package: string
  severity: Severity
  dependency: DependencyScope
  fixAvailable: boolean
  title: string
  url: string | null
}

export type FindingStatus = 'new' | 'expired' | 'allowed' | 'reported'

export interface EvaluatedFinding extends Finding {
  status: FindingStatus
  reason?: string
  expires?: string
}

export interface AllowlistEntry {
  id: string
  package: string
  reason: string
  /** ISO date (YYYY-MM-DD). The entry is accepted through the end of that day. */
  expires: string
}

export type CheckOutcome =
  | { kind: 'findings'; findings: Finding[] }
  | { kind: 'could-not-run'; reason: string }

/** Plug-in point: later scanners add one file implementing this. */
export interface Check {
  name: string
  run(): Promise<CheckOutcome>
}

export const EXIT_CLEAN = 0
export const EXIT_NEW_FINDINGS = 1
export const EXIT_COULD_NOT_RUN = 2
