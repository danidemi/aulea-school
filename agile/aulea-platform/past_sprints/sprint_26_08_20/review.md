# Sprint review — sprint_26_08_20

## Scope
* HOME-001 — the public home page, reachable without signing in.
* LOGIN-001 stayed in the backlog, deliberately not started this sprint (see sprint.md).

## What was done
* First-ever tech stack decision for this project, recorded as `adr/ADR-0001-tech-stack.md`:
  TypeScript + Node.js + React (client/server split), chosen over plain JavaScript for
  compile-time type safety as data contracts grow across future stories (OAuth, quiz data).
* Implemented HOME-001 in `piattaforma-corsi/aulea-platform/`:
  * `client/` — Vite + React + TypeScript app.
  * `server/` — Express + TypeScript, serves the built client, exposes `/healthz`.
* Automated unit tests (given/when/then style), 4 total (2 client, 2 server), all passing.
* Manual end-to-end smoke check: built the client, started the server, `curl`'d `/healthz`
  and `/` to confirm the real page is served.

## Decisions made during the sprint
* Sign-in button is an inert placeholder this sprint — visible, but no action wired.
  LOGIN-001 will wire it to the Google sign-in flow.
* Sprint review feedback (page felt too plain): moved the sign-in button out of the header
  into the centered body, and gave the header a background color distinct from the body.
  HOME-001's Definition of Done was updated to match.

## Observed
* `npm audit` reports 5 vulnerabilities (3 moderate, 1 high, 1 critical) in dev dependencies
  for both `client` and `server`. Not addressed this sprint — flagged, not fixed, since
  `npm audit fix --force` can include breaking changes. Carried over as a backlog candidate.
* The environment's Node.js is v18.19.1, which is below what `npm create vite@latest`
  requires (Node 20+, for `node:util`'s `styleText` export) — the client was hand-scaffolded
  instead of via the official generator. Worth noting for anyone re-running the scaffold step.
* LOGIN-001 was correctly identified during sprint planning as coupled to HOME-001 (same
  header/page), so it was kept out of this sprint rather than split awkwardly.

## Outcome
HOME-001 accepted at sprint review on 2026-08-20. Status set to DONE.
