# aulea-platform

Web app supporting `aulea-platform` services (see
`../agile/aulea-platform/references/vision.md`).
Stack decision: `../agile/aulea-platform/adr/ADR-0001-tech-stack.md`.

## Layout
* `client/` — React + TypeScript, built with Vite.
* `server/` — Node.js + TypeScript + Express. Serves the built client and
  hosts the API (email/password auth, courses, quizzes).

## Develop

```bash
cd client && npm install && npm test   # unit tests
cd server && npm install && npm test   # unit tests
```

## Run

```bash
cd server && npm run db:up             # starts Postgres + Mailpit (docker-compose.yml)
cd client && npm run build             # produces client/dist
cd server && npm run build && npm start   # serves the built client on :3000
```

## Human-led UAT (UAT-BOOTSTRAP-001)

```bash
./scripts/uat.sh
```

One script does everything a human needs for a UAT session, from a clean
checkout: tears down and recreates Postgres/mailpit, waits for Postgres to
be healthy, builds the server and the client, then starts the built server
in the foreground (Ctrl-C to stop). No other setup step is needed — the
server runs pending DB migrations itself on startup.

Once it logs `aulea-platform server listening on port 3000`, open
http://localhost:3000 in a browser. Captured emails (e.g. sign-up
confirmation links) are at http://localhost:8025.

Safe to re-run: each run starts from a clean container/volume state.
Whenever a change alters how the app is built, started, or migrated,
update this script in the same change.

## Browser end-to-end tests (E2E-BROWSER-001)

```bash
cd client && npm run test:e2e
```

Runs a headless Playwright click-through suite (`client/e2e/`) covering
every screen shipped so far (`/`, `/signup`, `/login`, `/courses`,
`/courses/:courseId`) — each test reaches its target only via UI
navigation (clicking links/buttons), never a typed URL.

Needs Docker: the suite brings up its own disposable Postgres (isolated
compose project + port `5433`, torn down again when the run ends), builds
the real server and client, and drives a real browser against them — it
never touches a developer's own `server/docker-compose.yml` stack or
long-running dev server. Safe to run alongside `npm run dev`/`db:up`.

The e2e stack also starts its own Mailpit (SMTP `1026`, HTTP API `8026`), so specs can
sign up and resend for real and read the confirmation links back from its API.

## Local email testing (Mailpit)

`server/docker-compose.yml` starts a `mailpit` container that catches all
emails sent by the server in local dev (e.g. sign-up confirmation links) —
nothing is sent to a real inbox. View captured emails at:

http://localhost:8025

SMTP itself is on port `1025`, matching `SMTP_HOST`/`SMTP_PORT` in
`server/.env.example`.

## Sign up limits and expiry (RESEND-CONFIRMATION-001, SIGNUP-EXPIRY-001)

Set in the server environment (all optional; invalid values fall back to the default):

| Variable | Default | Meaning |
| --- | --- | --- |
| `RESEND_COOLDOWN_SECONDS` | `60` | seconds between two confirmation resends for one address |
| `RESEND_MAX_PER_DAY` | `5` | resends per address in 24 hours |
| `RESEND_IP_MAX_PER_HOUR` | `20` | resend requests per client IP in one hour |
| `TRUST_PROXY` | unset | proxy hops (number), `true`, or address list for Express `trust proxy`. Set it behind a reverse proxy, or all callers share one IP limit |
| `SIGNUP_PENDING_MAX_AGE_DAYS` | `3` | age after which an unconfirmed account is replaced when its address signs up again |

