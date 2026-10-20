# ADR-0017: Node runtime version policy

## Status
Accepted — 2026-10-18

## Context
No earlier ADR chose a Node version. ADR-0001 only says "Node.js as the runtime". Older ADRs
mention a "Node 18 baseline" (the version of the first dev environment). That is out of date.
In practice the versions had drifted apart: local machines and CI ran Node 24, while the
production image ran Node 22. Nothing enforced a version (no `.nvmrc`, no `engines`). Tests
therefore did not run on the version that ships.

## Decision
* The whole project uses **one Node major version: 24** (the current LTS line).
* It is set in these places, which must change together:
  * `aulea-platform/Dockerfile` (`ARG NODE_VERSION`)
  * `aulea-platform/.nvmrc`
  * `engines.node` in `server/package.json` and `client/package.json` (`>=24`)
  * `node-version` in `.github/workflows/*.yml`
* When a new Node LTS is released, upgrade in one sprint task. Run the unit tests, the
  integration tests and the security check on the new version first.
* A dependency whose `engines.node` is above this version is not allowed.

## Consequences
* CI, local development and production run the same major version.
* `engines` makes `npm install` warn on an older Node.
* ADR-0003, ADR-0013 and ADR-0004 mention Node 18. They describe the situation when they were
  written and are superseded on this point by this ADR.
