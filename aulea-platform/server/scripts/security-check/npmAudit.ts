import { execFile } from 'node:child_process'
import { AuditParseError, findingsFromAudit, mergeScopes, parseAuditReport } from './parse.js'
import type { Check, CheckOutcome } from './types.js'

/** Runs `npm audit --json` in `cwd` and returns its stdout. Rejects when npm cannot be started. */
export type AuditExec = (cwd: string, omitDev: boolean) => Promise<string>

/**
 * `npm audit` exits 1 whenever it finds anything, so the exit code says nothing about whether
 * the tool worked. Only stdout is read: npm prints update notices on stderr.
 */
export const spawnNpmAudit: AuditExec = (cwd, omitDev) =>
  new Promise((resolve, reject) => {
    const args = ['audit', '--json', ...(omitDev ? ['--omit=dev'] : [])]
    execFile('npm', args, { cwd, maxBuffer: 32 * 1024 * 1024, timeout: 120_000 }, (error, stdout) => {
      if (stdout) return resolve(stdout)
      reject(error ?? new Error('npm audit printed nothing'))
    })
  })

export function npmAuditCheck(workspace: string, cwd: string, exec: AuditExec = spawnNpmAudit): Check {
  const name = `npm-audit:${workspace}`
  return {
    name,
    async run(): Promise<CheckOutcome> {
      try {
        const prod = findingsFromAudit(parseAuditReport(await exec(cwd, true)), name, 'prod')
        const all = findingsFromAudit(parseAuditReport(await exec(cwd, false)), name, 'prod')
        return { kind: 'findings', findings: mergeScopes(prod, all) }
      } catch (e) {
        const reason = e instanceof AuditParseError || e instanceof Error ? e.message : String(e)
        return { kind: 'could-not-run', reason }
      }
    },
  }
}
