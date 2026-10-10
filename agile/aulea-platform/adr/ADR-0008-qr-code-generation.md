# ADR-0008: QR code generation for the Quiz Session Monitor

## Status
Accepted — 2026-08-23

## Context
QUIZ-SESSION-CONTROL-001 needs to render a QR code encoding the student-facing session URL
on the Quiz Session Monitor page. No QR code library exists in either `client/` or `server/`
today — this is the first story that needs one.

**Revised 2026-08-23 (sprint planning for QUIZ-SESSION-CONTROL-001), before any code was
written against the original text**: the original decision below assumed the URL could be
built client-side from `window.location.origin`. That's wrong for this feature specifically —
the QR code exists to be scanned by a *different device* (a student's phone), so
`window.location.origin` (`http://localhost:3000` in local dev) is exactly the wrong source;
a phone can't reach a laptop's `localhost`. `APP_BASE_URL` already exists for this reason
(SIGN-UP-001's confirmation-link emails, `routes/signup.ts`'s `appBaseUrl()`) — a URL meant to
leave the browser is deliberately *not* derived from request/browser context. The session URL
follows the same rule.

## Decision
The server computes the full session URL (using the same `appBaseUrl()` helper `signup.ts`
already has, reading `process.env.APP_BASE_URL`) and includes it as a `takeUrl` field on the
session response (`POST .../sessions`, `GET /api/quiz-sessions/:sessionId`). The client never
constructs this URL itself — it only renders what the server sent.

QR rendering stays **client-side**, using the **`qrcode`** npm package (pure JavaScript, no
native/node-gyp dependency — consistent with ADR-0004's `bcryptjs` rationale), but via its
**string `toString(text, { type: 'svg' })` API**, not `toDataURL`/canvas — a plain SVG markup
string can be rendered as inline `<svg>` with no canvas element, which is easier to unit-test
(jsdom has no real canvas) and avoids a canvas-shim dependency.

* Client-side *rendering* still avoids a new server endpoint for the image itself — only the
  URL text needs to come from the server, per the paragraph above.
* `qrcode` is small, widely used, and has no runtime dependency on native bindings, matching
  this project's existing preference (ADR-0004) for keeping the dependency tree
  build-portable across local dev, Docker, and CI.

## Consequences
* `client/package.json` gains `qrcode` as a runtime dependency (plus `@types/qrcode` as a dev
  dependency, since the package doesn't ship its own types).
* The plain-text URL is still shown alongside the QR code (per the wireframe) — this is
  already in QUIZ-SESSION-CONTROL-001's Definition of Done, unaffected by this ADR.
* Every quiz-session route/test that returns a session includes `takeUrl`, computed
  server-side from `APP_BASE_URL`, the same way `signup.ts` already does for confirmation
  links.
* If a future story needs the QR code server-side (e.g. embedded in an emailed/printed
  handout), this decision is revisited then — not needed for this sprint.
