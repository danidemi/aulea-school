import { defineConfig } from 'vitest/config'

// TEST-INTEGRATION-001 / ADR-0014: repository tests on a real Postgres started by
// testcontainers. Needs a running Docker daemon. Each test file gets its own
// container (and its own worker), so files never share database state.
export default defineConfig({
  test: {
    include: ['src/**/*.integration.test.ts'],
    pool: 'forks',
    fileParallelism: true,
    hookTimeout: 120_000, // pulling the image and starting Postgres
    testTimeout: 30_000,
  },
})
