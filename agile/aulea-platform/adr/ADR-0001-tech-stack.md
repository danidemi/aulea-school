# ADR-0001: Tech stack for aulea-platform

## Status
Accepted — 2026-08-20

## Context
`aulea-platform` is a greenfield web application (source folder:
`piattaforma-corsi/aulea-platform`, currently empty). The first sprint
develops HOME-001 (a public home page). A later story, LOGIN-001, adds
Google account sign-in. No tech stack existed yet, so one had to be chosen
before any code was written.

## Decision
Use **TypeScript + Node.js + React**:
* React for the UI, since the near-term stories are page/component-level
  (home page, then a sign-in flow) and later ones (per `references/vision.md`)
  add interactive quiz management — a component model fits that.
* Node.js as the runtime, so the frontend build tooling and a future
  backend (needed for the Google OAuth flow in LOGIN-001, which cannot be
  done safely client-side alone) share one language and package ecosystem.
* TypeScript over plain JavaScript for compile-time type safety on data
  contracts that will grow over sprints (OAuth responses, quiz/session
  data), better refactoring safety, and IDE tooling, at the cost of a small
  build-step setup.

## Consequences
* Every story from here on is implemented in this stack unless a future
  ADR revises it.
* A build step (TypeScript compiler / bundler) is required; there is no
  plain-JS fallback path.
* The project is structured as `client/` (React + TypeScript, built with
  Vite) and `server/` (Node.js + TypeScript + Express), so the server can
  serve the built client and, from LOGIN-001 onward, host the OAuth
  endpoints.
