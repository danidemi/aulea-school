# Sprint review — 2026-09-27

Both planned PBIs accepted as `DONE`, human sign-off: "everything works perfectly. The sprint
review is a success."

* `USER-MENU-001` — header's tenant pill/email/Log out collapsed into an avatar + dropdown
  (shadcn/Radix `dropdown-menu.tsx`, ADR-0006). Verified end-to-end against the real built app;
  screenshots in `assets/USER-MENU-001/`.
* `VERSION-INFO-001` — new `GET /api/version` (server) plus a Vite-injected `__CLIENT_VERSION__`
  (client), both shown inside `USER-MENU-001`'s dropdown with a mismatch flag. Verified end-to-end;
  screenshots in `assets/VERSION-INFO-001/`.

## Observed

* This app is deliberately light-only (`client/src/index.css` pins `color-scheme: light` for the
  QTI player's contrast) — flagged during development that the do_and_donts.md light/dark
  screenshot rule doesn't apply here; accepted as-is at review, no separate dark-mode screenshot
  needed for either PBI.
* `VERSION-INFO-001`'s dirty/commit-timestamp git calls were scoped to the `aulea-platform`
  folder specifically, not the whole multi-project repo this lives in — a design refinement made
  during implementation (not discussed at planning), accepted at review.
* Deferred from this sprint, left in `backlog/` with their design decisions already recorded from
  planning: `BUG-BREADCRUMB-NAV`, `TABLE-STYLE-001` (both touch
  `QuizSessionHistoryPage.tsx`/`QuizSessionMonitorPage.tsx` — flagged coupling still applies
  whenever they're picked up together).

## Retrospective

Skipped at the human's request — "nothing to be discussed."
