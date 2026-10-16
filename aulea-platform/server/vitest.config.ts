import { configDefaults, defineConfig } from 'vitest/config'

// TEST-INTEGRATION-001 / ADR-0014: `npm test` stays DB-free and never starts
// Docker, so repository integration tests are excluded here and run only
// through `npm run test:integration` (vitest.integration.config.ts).
export default defineConfig({
  test: {
    exclude: [...configDefaults.exclude, '**/*.integration.test.ts'],
  },
})
