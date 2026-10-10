import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// E2E-BROWSER-001: tears down the disposable Postgres compose stack
// `run-e2e-server.sh` started for this run, once Playwright is done with
// it (the webServer process itself is just killed, not asked to clean up
// — see that script's own comment on why).
export default function globalTeardown() {
  const __dirname = path.dirname(fileURLToPath(import.meta.url))
  const composeFile = path.join(__dirname, 'docker-compose.e2e.yml')
  try {
    execFileSync('docker', ['compose', '-p', 'aulea-platform-e2e', '-f', composeFile, 'down', '-v'], {
      stdio: 'inherit',
      env: { ...process.env, E2E_DB_PORT: process.env.E2E_DB_PORT ?? '5433' },
    })
  } catch (err) {
    console.error('[e2e] global teardown: failed to tear down the disposable stack', err)
  }
}
