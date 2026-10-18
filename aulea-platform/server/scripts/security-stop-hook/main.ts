import { execFile } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { decide, HOOK_ALLOW, type CheckResult } from './decide.js'

// SEC-HOOK-001 / ADR-0016: Claude Code Stop hook. Reads the hook JSON from stdin, runs
// scripts/security-check.sh when the working tree changed something relevant, and exits 2
// (stderr goes to Claude) on new findings. Any failure of the hook itself must not block.

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')

function run(cmd: string, args: string[], cwd: string): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((res, rej) => {
    execFile(cmd, args, { cwd, maxBuffer: 32 * 1024 * 1024, timeout: 300_000 }, (error, stdout, stderr) => {
      const code = error ? (typeof error.code === 'number' ? error.code : -1) : 0
      if (error && typeof error.code !== 'number') return rej(error)
      res({ code, stdout, stderr })
    })
  })
}

async function readStdin(): Promise<string> {
  let data = ''
  for await (const chunk of process.stdin) data += chunk
  return data
}

/** Paths changed in the working tree (tracked and untracked), relative to the repository root. */
async function changedFiles(): Promise<string[]> {
  const { stdout } = await run('git', ['status', '--porcelain', '--untracked-files=all', '--', root], root)
  return stdout
    .split('\n')
    .filter((line) => line.length > 3)
    .map((line) => line.slice(3).split(' -> ').pop()!.replace(/^"|"$/g, ''))
    .map((p) => p.replaceAll('\\', '/'))
}

async function runCheck(): Promise<CheckResult> {
  try {
    const { code, stdout, stderr } = await run(`${root}/scripts/security-check.sh`, [], root)
    return { kind: 'ran', exitCode: code, output: `${stdout}${stderr}` }
  } catch (e) {
    return { kind: 'unavailable', reason: e instanceof Error ? e.message : String(e) }
  }
}

async function main(): Promise<number> {
  let stopHookActive = false
  try {
    const raw = (await readStdin()).trim()
    stopHookActive = raw ? JSON.parse(raw).stop_hook_active === true : false
  } catch {
    // Unreadable input: treat as a first stop, the check itself decides.
  }
  const decision = await decide({ stopHookActive, changedFiles: await changedFiles(), runCheck })
  if (decision.message) console.error(decision.message)
  return decision.exitCode
}

main().then(
  (code) => process.exit(code),
  (e) => {
    console.error(`Security stop hook: unexpected error, not blocking: ${e instanceof Error ? e.message : String(e)}`)
    process.exit(HOOK_ALLOW)
  },
)
