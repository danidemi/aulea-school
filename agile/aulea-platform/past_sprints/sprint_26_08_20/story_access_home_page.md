ID: HOME-001

As:
an `unregistered user`

I want to:
open the `learning platform` home page without needing to sign in first

So that:
I can see what the platform is and what services it offers before deciding to sign in

Definition of Done:
* the home page loads at the platform URL with no Google sign-in prompt first
* a top header states the product name, styled distinctly from the body
* a centered sign-in/log-in button is the only body content
* no other page/section is reachable while `unregistered`

Implemented (sprint, 2026-08-20):
* React client (`client/`) + Express server (`server/`, serves the built client), stack per
  `adr/ADR-0001-tech-stack.md`
* sign-in button was an inert placeholder — no action wired yet (wired by LOGIN-001)
* verified: `client/src/App.test.tsx`, `server/src/app.test.ts`, plus a manual smoke check
