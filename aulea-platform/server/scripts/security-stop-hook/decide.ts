// SEC-HOOK-001 / ADR-0016: pure decision logic of the Claude Code Stop hook.
// Exit codes of the hook: 0 lets Claude stop, 2 blocks the stop and feeds stderr back to Claude.

export const HOOK_ALLOW = 0
export const HOOK_BLOCK = 2

/** Exit codes of `scripts/security-check.sh` (ADR-0016). */
export const CHECK_CLEAN = 0
export const CHECK_NEW_FINDINGS = 1

export type CheckResult =
  | { kind: 'ran'; exitCode: number; output: string }
  | { kind: 'unavailable'; reason: string }

export interface HookDecisionInput {
  stopHookActive: boolean
  /** Paths changed in the working tree, relative to the repository root, `/` separated. */
  changedFiles: string[]
  /** Called only when the check is needed, so a skipped check costs nothing. */
  runCheck: () => Promise<CheckResult>
}

export interface HookDecision {
  exitCode: number
  /** Written to stderr. Empty when there is nothing to say. */
  message: string
}

const PROJECT_DIR = 'aulea-platform/'

/** A change that can introduce a vulnerability: manifests, lockfiles, Dockerfiles, server source. */
export function isRelevantChange(path: string): boolean {
  if (!path.startsWith(PROJECT_DIR)) return false
  const name = path.slice(path.lastIndexOf('/') + 1)
  if (name === 'package.json' || name === 'package-lock.json') return true
  if (name === 'Dockerfile' || name.startsWith('Dockerfile.') || name.endsWith('.Dockerfile')) return true
  return path.startsWith(`${PROJECT_DIR}server/src/`)
}

const GUIDANCE = [
  'Security check found new findings (see above). Address them before you stop:',
  '* fix the finding, for example by upgrading the dependency to a version that has a fix;',
  '* or, if the risk is accepted, add an entry to aulea-platform/security/allowlist.json with a reason and an expiry date (at most 6 months), and say so to the human;',
  '* or report the finding to the human and explain why it cannot be fixed now.',
  'Do NOT run `npm audit fix --force`: it makes breaking upgrades and hides the finding instead of solving it.',
].join('\n')

export async function decide(input: HookDecisionInput): Promise<HookDecision> {
  // The Stop hook runs again after it blocked once. Blocking twice would loop forever
  // on findings that have no fix.
  if (input.stopHookActive) return { exitCode: HOOK_ALLOW, message: '' }
  if (!input.changedFiles.some(isRelevantChange)) return { exitCode: HOOK_ALLOW, message: '' }

  const result = await input.runCheck()
  if (result.kind === 'unavailable') {
    return { exitCode: HOOK_ALLOW, message: `Security check could not run, not blocking: ${result.reason}` }
  }
  if (result.exitCode === CHECK_CLEAN) return { exitCode: HOOK_ALLOW, message: '' }
  if (result.exitCode === CHECK_NEW_FINDINGS) {
    return { exitCode: HOOK_BLOCK, message: `${result.output.trimEnd()}\n\n${GUIDANCE}` }
  }
  // Exit 2 (could not run, e.g. no network) or anything unexpected: warn, never block.
  return {
    exitCode: HOOK_ALLOW,
    message: `Security check could not run (exit ${result.exitCode}), not blocking.\n${result.output.trimEnd()}`.trimEnd(),
  }
}
