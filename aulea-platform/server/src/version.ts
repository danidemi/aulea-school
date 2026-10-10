import { existsSync, readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * VERSION-INFO-001: reported for both the server and (separately, computed
 * client-side at build/dev-server-start time) the client bundle, so a
 * trainer/developer can tell whether either process is running stale code.
 */
export interface GitVersionFields {
  branch: string
  commitSha: string
  dirty: boolean
  commitTimestamp: string
}

export interface VersionInfo extends GitVersionFields {
  label: 'Built' | 'Dev build'
  builtAt?: string
  startedAt?: string
}

const __dirname = path.dirname(fileURLToPath(import.meta.url))
// `server/src/version.ts` (dev, via tsx) and `server/dist/version.js` (prod,
// after `tsc -b`) both sit two levels under the `aulea-platform` folder —
// scope the dirty/commit-timestamp git calls to that folder specifically
// (not the whole multi-project repo this lives in) so editing something
// unrelated elsewhere in the repo (e.g. a sprint spec file) doesn't falsely
// flag this app as "dirty" or shift its reported commit timestamp.
const LEARNING_PLATFORM_ROOT = path.resolve(__dirname, '../..')
const VERSION_JSON_PATH = path.join(__dirname, 'version.json')

function git(args: string[]): string {
  return execFileSync('git', args, { cwd: LEARNING_PLATFORM_ROOT, encoding: 'utf8' }).trim()
}

export function computeGitVersionFields(): GitVersionFields {
  return {
    branch: git(['rev-parse', '--abbrev-ref', 'HEAD']),
    commitSha: git(['rev-parse', '--short', 'HEAD']),
    dirty: git(['status', '--porcelain', '--', '.']).length > 0,
    commitTimestamp: git(['log', '-1', '--format=%cI', '--', '.']),
  }
}

let cachedDevVersionInfo: VersionInfo | undefined

/**
 * Production (`dist/version.json` present, written by the `postbuild`
 * script) reads that file. Dev (`tsx watch src/index.ts`, no separate build
 * step) computes the same git fields live instead, cached after the first
 * call so `startedAt` reflects process start rather than every request.
 */
export function getVersionInfo(): VersionInfo {
  if (existsSync(VERSION_JSON_PATH)) {
    return JSON.parse(readFileSync(VERSION_JSON_PATH, 'utf8')) as VersionInfo
  }
  if (!cachedDevVersionInfo) {
    cachedDevVersionInfo = { ...computeGitVersionFields(), label: 'Dev build', startedAt: new Date().toISOString() }
  }
  return cachedDevVersionInfo
}
