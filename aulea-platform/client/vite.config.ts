/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { configDefaults } from 'vitest/config'
import { execFileSync } from 'node:child_process'
import path from 'node:path'

// VERSION-INFO-001: same git snapshot shape the server computes
// (`server/src/version.ts`) — scoped to this `aulea-platform` folder
// (not the whole multi-project repo this lives in), computed once here at
// config-load time (covers both `vite build` and `vite dev`) and injected
// as a single `__CLIENT_VERSION__` constant below.
const LEARNING_PLATFORM_ROOT = path.resolve(__dirname, '..')

// Docker builds have no .git: the Dockerfile passes the snapshot in as env.
const fromEnv = process.env.GIT_COMMIT_SHA
  ? {
      branch: process.env.GIT_BRANCH ?? 'unknown',
      commitSha: process.env.GIT_COMMIT_SHA,
      dirty: process.env.GIT_DIRTY === 'true',
      commitTimestamp: process.env.GIT_COMMIT_TIMESTAMP ?? '',
    }
  : undefined

function git(args: string[]): string {
  return execFileSync('git', args, { cwd: LEARNING_PLATFORM_ROOT, encoding: 'utf8' }).trim()
}

export default defineConfig(({ command }) => {
  const clientVersion = {
    ...(fromEnv ?? {
      branch: git(['rev-parse', '--abbrev-ref', 'HEAD']),
      commitSha: git(['rev-parse', '--short', 'HEAD']),
      dirty: git(['status', '--porcelain', '--', '.']).length > 0,
      commitTimestamp: git(['log', '-1', '--format=%cI', '--', '.']),
    }),
    label: command === 'build' ? 'Built' : 'Dev build',
    ...(command === 'build' ? { builtAt: new Date().toISOString() } : { startedAt: new Date().toISOString() }),
  }

  return {
    plugins: [react()],
    define: {
      __CLIENT_VERSION__: JSON.stringify(clientVersion),
    },
    server: {
      // SIGNUP-EXPEDITE-001: the dev server (5173) and the Express API
      // (index.ts, port 3000) are separate processes; without this, fetches
      // to /api/* from the Vite dev server 404 instead of reaching Express.
      // Production doesn't need this — app.ts serves the built client itself.
      proxy: {
        '/api': 'http://localhost:3000',
      },
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: './src/setupTests.ts',
      // E2E-BROWSER-001's Playwright specs live under e2e/ and run via
      // `npm run test:e2e`, not vitest — exclude them here so `npm test`
      // doesn't try (and fail) to run them as unit tests.
      exclude: [...configDefaults.exclude, 'e2e/**'],
    },
  }
})
