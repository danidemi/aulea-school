# Sprint review — sprint started 2026-08-23, closed 2026-08-23

## Outcome

All 3 scoped stories accepted as DONE by the human, no rejections.

* **COURSE-001** — column-header click-to-sort (tri-state: asc → desc → unsorted) replacing
  the rejected "Sort by" dropdown. 43/43 client tests green, build clean.
* **HOME-LOGIN-001** — shared `SignInForm` component now rendered on both `/` and `/login`;
  signed-in visitors redirect to `/courses`. Deviated from the planning-time approach
  (`useNavigate` → `window.location.assign`) because ADR-0004 requires `App.tsx` stay
  Router-ancestor-free; documented in the story file's "Deviation from plan" section. 47/47
  client tests green, build clean.
* **UAT-BOOTSTRAP-001** — `./scripts/uat.sh` implemented and manually run twice end-to-end
  against real Docker/Postgres; confirmed `/`, `/courses`, `/api/me` all reachable after a
  single script run with no other setup step. README updated.

No ADRs were needed this sprint, as anticipated at planning.

## Retrospective

Skipped at the human's request — nothing flagged as needing a process change this sprint.
`references/do_and_donts.md` left unchanged.
