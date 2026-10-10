import { writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { computeGitVersionFields, type VersionInfo } from '../src/version.js'

/**
 * VERSION-INFO-001: run as the `postbuild` step, after `tsc -b` has
 * produced `dist/` — writes the git snapshot the server serves at
 * `GET /api/version` in production, so it reflects the exact commit the
 * build was made from rather than being recomputed (and possibly drifting)
 * at every server start.
 */
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DIST_DIR = path.resolve(__dirname, '../dist')

const versionInfo: VersionInfo = {
  ...computeGitVersionFields(),
  label: 'Built',
  builtAt: new Date().toISOString(),
}

writeFileSync(path.join(DIST_DIR, 'version.json'), JSON.stringify(versionInfo, null, 2))
console.log('wrote dist/version.json:', versionInfo)
