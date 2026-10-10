ID: DEPS-001

As:
a `maintainer` of aulea-platform

I want to:
address the `npm audit` findings in `client` and `server`

So that:
the project does not carry known vulnerable dependencies indefinitely

Definition of Done:
* `npm audit` on `client` and `server` reports zero high/critical vulnerabilities
* `npm audit fix` (no `--force`) tried first; anything only `--force` can fix is either fixed
  with manual verification or logged here as accepted risk with a reason
* existing tests still pass after any bump

Implemented (sprint, 2026-08-22):
* plain `npm audit fix` fixed nothing on either package (every path needed a semver-major
  bump) — used targeted version pins instead: `client` `vite` ^5→^7, `@vitejs/plugin-react`
  →^5.2.0, `vitest` ^2→^4 (clears everything except `react-router-dom`); `server` `vitest`
  ^2→^4 (clears everything except the `drizzle-kit`/`@esbuild-kit/*` chain)
* accepted risk: `react-router-dom` stays v6 (v7 needs Node ≥20, project baseline is 18.19.1,
  per ADR-0004; the actual vulnerabilities — open-redirect/SSR hydration — don't apply, no SSR,
  no attacker-controlled paths fed to `<Link>`/`useNavigate`)
* accepted risk: `drizzle-kit`'s `@esbuild-kit/*` chain (dev-only) — only fix is a `drizzle-kit`
  pre-release; the underlying advisory is about esbuild's dev server accepting cross-origin
  requests, and `drizzle-kit generate`/`migrate` never start one
* found and fixed while verifying: `server/tsconfig.json` had no test-file `exclude`, so `tsc -b`
  compiled `*.test.ts` into `dist/`; vitest 4 (unlike 2) picked these up and silently ran every
  server test twice (78 reported as 156) — fixed by excluding test files from the build
* `client`: 7→2 vulnerabilities (both moderate/accepted), 41/41 tests green on vitest 4,
  `tsc -b && vite build` clean. `server`: 8→4 (moderate/accepted), 78/78 tests green,
  compiled `dist/index.js` smoke-tested directly with `node`
