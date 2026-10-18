import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { AllowlistError, evaluate, loadAllowlist } from './allowlist.js'
import { npmAuditCheck } from './npmAudit.js'
import { buildSummary, formatHuman, type CheckStatus } from './report.js'
import { EXIT_COULD_NOT_RUN, type Check, type EvaluatedFinding, type Finding } from './types.js'

// SEC-CHECK-001 / ADR-0016. Exit codes: 0 clean, 1 new findings, 2 tool could not run.
// Usage: scripts/security-check.sh [--json <file>] [--allowlist <file>]

function option(args: string[], name: string): string | undefined {
  const i = args.indexOf(name)
  return i >= 0 ? args[i + 1] : undefined
}

async function main(): Promise<number> {
  const args = process.argv.slice(2)
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
  const allowlistPath = resolve(option(args, '--allowlist') ?? `${root}/security/allowlist.json`)
  const jsonPath = option(args, '--json')
  const now = new Date()

  let allowlist
  try {
    allowlist = loadAllowlist(allowlistPath)
  } catch (e) {
    console.error(`Security check: ${(e as AllowlistError).message}`)
    return EXIT_COULD_NOT_RUN
  }

  const checks: Check[] = [npmAuditCheck('server', `${root}/server`), npmAuditCheck('client', `${root}/client`)]
  const outcomes = await Promise.all(checks.map((c) => c.run()))

  const statuses: CheckStatus[] = []
  const findings: Finding[] = []
  outcomes.forEach((outcome, i) => {
    const name = checks[i].name
    if (outcome.kind === 'could-not-run') {
      statuses.push({ name, status: 'could-not-run', error: outcome.reason })
    } else {
      statuses.push({ name, status: 'ok' })
      findings.push(...outcome.findings)
    }
  })

  const evaluated: EvaluatedFinding[] = evaluate(findings, allowlist, now)
  const summary = buildSummary(statuses, evaluated, now)
  console.log(formatHuman(summary))
  if (jsonPath) {
    mkdirSync(dirname(resolve(jsonPath)), { recursive: true })
    writeFileSync(jsonPath, JSON.stringify(summary, null, 2) + '\n')
  }
  return summary.exitCode
}

main().then(
  (code) => process.exit(code),
  (e) => {
    console.error(`Security check: unexpected error: ${e instanceof Error ? e.message : String(e)}`)
    process.exit(EXIT_COULD_NOT_RUN)
  },
)
