import { defineConfig, devices } from '@playwright/test'

// E2E-BROWSER-001: browser click-through coverage for every screen
// shipped so far, run against a disposable Postgres + the real built
// server/client (never a dev-mode shortcut — see `run-e2e-server.sh`
// and `do_and_donts.md`'s disposable-instance-verification rule).
const PORT = process.env.E2E_PORT ?? '3100'
const BASE_URL = `http://localhost:${PORT}`

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
  },
  webServer: {
    command: './e2e/run-e2e-server.sh',
    url: BASE_URL,
    reuseExistingServer: false,
    timeout: 120_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
  globalTeardown: './e2e/global-teardown.ts',
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
