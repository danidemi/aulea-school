# Sprint plan — started 2026-09-27

## Scope

The "header cluster" only (human's choice at sprint planning, effort 13 total). The other two
READY PBIs (`BUG-BREADCRUMB-NAV`, `TABLE-STYLE-001`, effort 10) were left in `backlog/` — their
open design questions were still resolved this session and recorded on each PBI, so the next
planning pass can pick them up without re-grooming.

1. **USER-MENU-001** (Effort 5) — collapse the header's tenant pill/email/Log out into an
   avatar + dropdown.
2. **VERSION-INFO-001** (Effort 8, depends on #1) — client/server version info, shown inside
   #1's new dropdown. Build strictly after #1 — both touch `client/src/components/AppHeader.tsx`.

## Not selected this sprint (left in `backlog/`)

* **BUG-BREADCRUMB-NAV** (Effort 5) — breadcrumb missing on quiz-session pages. Design resolved
  at planning: new `GET /api/quizzes/:quizId` endpoint (quiz→course), breadcrumb built on
  `matchPath`/`useParams` (not `useMatches` — the app uses a plain `<BrowserRouter>`, not a data
  router). See the PBI's own "Decided with the human at sprint planning" note.
* **TABLE-STYLE-001** (Effort 5) — shared table style. Design resolved at planning: a shared React
  component (shadcn `table.tsx` copied into `components/ui/`), not shared CSS classes. Also shares
  `QuizSessionHistoryPage.tsx`/`QuizSessionMonitorPage.tsx` with `BUG-BREADCRUMB-NAV` — flagged
  coupling, unresolved since both are deferred together.

## Technical decisions (no new ADR this sprint)

Both stories extend existing ADRs rather than introduce new tech:
* **USER-MENU-001** copies shadcn/ui's `dropdown-menu.tsx` into `client/src/components/ui/`,
  adding `@radix-ui/react-dropdown-menu` — extends ADR-0006's copy-in convention, doesn't change
  the chosen component library.
* **VERSION-INFO-001** shells out to the `git` CLI (already present; `server/docker-compose.yml`
  only runs Postgres, the server itself runs on the host) from `vite.config.ts` (client) and a
  server build/startup step — no new npm dependency, no ADR needed.

## Suggested build order

1. USER-MENU-001 (screenshot: collapsed avatar + open dropdown, light/dark)
2. VERSION-INFO-001, after #1 lands (screenshot: matched and mismatched version states)

## Per-story technical plan

See each PBI's own "Implementation Plan" section:
* `active_sprint/story_user_avatar_menu.md`
* `active_sprint/story_version_build_info.md`
