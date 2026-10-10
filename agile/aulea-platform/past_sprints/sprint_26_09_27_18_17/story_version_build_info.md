ID: VERSION-INFO-001

Status: DONE — accepted at sprint review 2026-09-27

Priority: Medium

Effort: 8

Depends on: USER-MENU-001 (`backlog/`) — version info is placed inside that story's avatar
dropdown (decided with the human, 2026-09-27), so this story cannot be built/verified until the
dropdown exists. Sequence `USER-MENU-001` first in sprint planning.

As:
a `trainer` (or anyone running the app for development/testing)

I want to:
see, somewhere in the UI, exactly what source snapshot and build the running app corresponds to
(git branch, short commit SHA, whether the working tree was clean or had uncommitted changes at
build time, the commit's own timestamp, and the timestamp the app was built)

So that:
I can tell at a glance whether I'm looking at the version of the code I think I am, instead of
discovering later that I forgot to restart/rebuild and was testing stale code

Definition of Done:
* the app is two processes (Vite client, Express server — see `client/vite.config.ts`'s dev
  proxy and `server/src/app.ts` serving the built client in production). Decided with the human
  (2026-09-27): version info is tracked for **both** processes, with a mismatch flag — not
  server-only — since either one can be the stale one
* the server exposes its own version info (e.g. `GET /api/version`) reflecting the actual
  tree/process it was started from; the client bundle carries its own version info baked in at
  client-build time; the UI displays both and visibly flags when they disagree
* reported for each side, at minimum: branch name, short commit SHA, a clean/dirty flag for the
  working tree at build/start time, the current commit's own timestamp, and either the build
  timestamp (production, built via `tsc -b`/`vite build`, labeled "Built") or the process start
  timestamp (dev mode via `tsx`/`vite`, where there is no separate build step, labeled "Dev build"
  — decided with the human, 2026-09-27, so it isn't misread as a real production build)
* displayed inside `USER-MENU-001`'s avatar dropdown (decided with the human, 2026-09-27 — not a
  separate footer/about area) as a short label per side (e.g. `main@a1b2c3d-dirty`), with the full
  breakdown (branch, SHA, dirty/clean, commit time, build/start time) available on hover/expand
  rather than crammed into one long string — a dot-joined string like
  `<branch>.<sha>.<status>.<...>` is fragile: branch names can contain `/` or `.` (e.g.
  `feature/foo`), which breaks unambiguous parsing/display of a dot-separated format
* the info is generated automatically (no manual editing required to keep it accurate)
* verification: manual — restart the server and/or rebuild the client from two different
  commits/branches and confirm the displayed info changes accordingly for each side
  independently, confirm each shows "dirty"/equivalent when built/started from a tree with
  uncommitted changes, and confirm the mismatch flag appears when client and server versions are
  made to disagree (e.g. restart only one of the two processes after a commit)

Note:
User's own words on motivation: "already happened that I had updated the sources, but I was
testing an old version because I forgot to restart it." The user's own proposed format
(`<branch>.<sha>.<status>.<commit-tstamp>.<build-tstamp>`) is recorded above as one input, not
adopted as-is — see the DoD bullet on why a dot-joined string is fragile. Scope (client+server with
mismatch flag, rather than server-only) confirmed with the human 2026-09-27.

Implementation Plan (sprint planning, 2026-09-27):
* Checked deployment shape before design: `server/docker-compose.yml` only runs the Postgres
  database; the server itself runs directly on the host (`npm run build && npm start` →
  `node dist/index.js`, per `do_and_donts.md`'s `sprint_26_08_21` DON'T), so the `git` CLI and the
  repo's `.git` are always present at both build time and process-start time — no container-without-
  `.git` problem, no need to vendor git info another way.
* No new ADR needed — this uses the already-available `git` CLI and Node's built-in
  `child_process`, not a new npm dependency (a Vite git-info plugin was considered and rejected for
  that reason).
* Server side:
  * Production (`tsc -b` build): add a build step (e.g. a `prebuild` script, or the start of the
    existing `build` script) that shells out to `git` (`rev-parse --abbrev-ref HEAD`, `rev-parse
    --short HEAD`, `status --porcelain` for dirty/clean, `log -1 --format=%cI` for commit
    timestamp) and writes `dist/version.json` with those fields plus `builtAt: <now>`,
    `label: 'Built'`.
  * Dev (`tsx watch src/index.ts`, no separate build step): compute the same git fields live at
    process startup instead of reading a (possibly stale, possibly absent) `dist/version.json`;
    `startedAt: <now>`, `label: 'Dev build'`.
  * New `GET /api/version` returns whichever of the two applies.
* Client side: compute the same git fields in `client/vite.config.ts` at config-load time (runs for
  both `vite build` and `vite dev`; Vite's `command` config param distinguishes them — `'build'` →
  `label: 'Built'`, `'serve'` → `label: 'Dev build'`), inject via Vite's `define` as a single
  `__CLIENT_VERSION__` constant (JSON-stringified), read by a small typed
  `client/src/lib/version.ts`.
* UI: inside `USER-MENU-001`'s dropdown, add two short labels, one per side (e.g. `Server:
  main@a1b2c3d-dirty`, `Client: main@a1b2c3d`), each expandable (hover or click-to-expand, for
  keyboard/touch parity) to the full breakdown (branch, sha, dirty/clean, commit time, build/start
  time) — not the single dot-joined string the DoD already rejected as fragile. Show a visible
  mismatch flag (e.g. a warning badge) when the two sides' commit SHAs differ.
* Verification: per the DoD's own verification bullet — restart server / rebuild client from
  different commits and confirm both sides update independently, confirm the dirty flag with an
  uncommitted change, confirm the mismatch flag when the two disagree. Screenshot both the
  matched and mismatched states, per `do_and_donts.md`'s GUI screenshot rule.

Implemented (sprint, 2026-09-27):
* `server/src/version.ts` — `computeGitVersionFields()` (branch, short SHA, dirty, commit
  timestamp) shared by both the dev-mode live path and the build-time script below;
  `getVersionInfo()` reads `dist/version.json` if present (production), else computes live and
  caches the result (dev), so `startedAt` reflects process start, not every request.
* Design refinement made during implementation, not in the original plan: git calls are scoped
  to the `aulea-platform` folder (`git status --porcelain -- .` / `git log -1 -- .` with `cwd`
  set there), not the whole multi-project repo this lives in — otherwise editing an unrelated
  spec file elsewhere in the repo would falsely mark the running app "dirty" or shift its
  reported commit timestamp. Branch/commit SHA stay repo-wide (there's only one HEAD). Flagging
  for human confirmation since this wasn't discussed at planning.
* `server/scripts/write-version.ts` — new `postbuild` script (`server/package.json`) that runs
  after `tsc -b`, writes `dist/version.json` (`label: 'Built'`, `builtAt: <now>`). `dist/` is
  already gitignored, so this generated file is never committed.
* `server/src/routes/version.ts` — new `GET /api/version`, no auth (same as `/healthz`), mounted
  in `app.ts`. Verified end-to-end: a clean `npm run build` in `server/` produces a correct
  `dist/version.json`, and the built server serves it back unchanged from `/api/version`.
* `client/vite.config.ts` — converted to the function form of `defineConfig` to read Vite's
  `command` param; computes the same git fields (same folder-scoping as the server) and injects
  them via `define` as `__CLIENT_VERSION__`, labeled `'Built'`/`builtAt` for `vite build` or
  `'Dev build'`/`startedAt` for `vite dev`.
* `client/src/lib/version.ts` (`getClientVersionInfo`), `client/src/lib/useServerVersionInfo.ts`
  (`GET /api/version` on mount, same shape), `client/src/components/VersionInfoMenu.tsx` — renders
  one `<details>` row per side inside USER-MENU-001's dropdown (native disclosure widget, not
  hover-only, for keyboard/touch parity), a short label (`branch@sha[-dirty]`) as the visible
  summary, full breakdown (branch, commit, status, commit time, built/started timestamp) inside,
  and a `TriangleAlert` warning line when the two sides' commit SHAs differ. Wired into
  `AppHeader.tsx` below the "Log out" item.
* `client/src/components/VersionInfoMenu.test.tsx` (given/when/then) covers both the
  matched (no flag) and mismatched (flag shown) cases directly.
* Full automated suite green: server `npx vitest run` 215/215, client `npx vitest run` 99/99
  (both include this story's new tests), both `npx tsc -b` clean.
* End-to-end verification against the real built app (disposable Playwright/Postgres stack, same
  `client/e2e/run-e2e-server.sh` harness as USER-MENU-001, not a dev-mode shortcut): confirmed the
  dropdown shows matching client/server short labels with no mismatch flag on a normal run
  (screenshot:
  [`assets/VERSION-INFO-001/verification-matched.png`](assets/VERSION-INFO-001/verification-matched.png)).
  A genuine two-commit divergence wasn't created for this (would mean committing throwaway
  history mid-sprint); instead `/api/version`'s response was intercepted via Playwright's
  `page.route` to simulate a stale server, confirming the mismatch flag and both expandable
  breakdowns render correctly (screenshot:
  [`assets/VERSION-INFO-001/verification-mismatched.png`](assets/VERSION-INFO-001/verification-mismatched.png)).
  The dirty flag itself is verified for real, not simulated — this sprint's own uncommitted
  `aulea-platform` changes show up as `dirty` on both sides in the matched-state screenshot.
