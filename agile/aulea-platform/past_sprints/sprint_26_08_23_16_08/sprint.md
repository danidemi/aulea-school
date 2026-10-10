# Sprint plan — sprint started 2026-08-23

## Scope

3 stories, chosen at Sprint Planning (2026-08-23) from the backlog groomed the same day:

* **COURSE-001** (`story_course_dashboard.md`) — carried over `IN PROGRESS` from the previous
  sprint's review rejection; sort-UX rework (column-header click-to-sort, tri-state, with a
  direction indicator) replacing the "Sort by" dropdown
* **HOME-LOGIN-001** (`story_login_form_on_home.md`) — shared sign-in form shown on the home
  page as well as `/login`; signed-in users redirect to `/courses`
* **UAT-BOOTSTRAP-001** (`story_uat_bootstrap_script.md`) — single script bringing up the
  full stack (Postgres/mailpit, built server, built client) for human-led UAT

Deliberately left out of this sprint (see `references/do_and_donts.md`'s sizing guidance and
CLAUDE.md's "choose the smallest possible subset"):

* **QTI3-MIGRATION-001** and **QTI-UAT-SAMPLES-001** — both `READY`, but held back to keep
  this sprint small; the second depends on the first anyway
* **COURSE-DETAIL-001** — `READY`, but depends on COURSE-001's rework landing first; picking
  it up in the same sprint as COURSE-001 would stack a dependent story on top of an
  already-in-flight rework
* **E2E-BROWSER-001** — `READY`, held back; no story in this sprint's scope required it

## Development sequence

1. **COURSE-001** first — it's unfinished carried-over work, and nothing else in this sprint
   depends on or shares code with it (its rework is contained to `CourseDashboardPage.tsx`
   and no server changes)
2. **HOME-LOGIN-001** — independent of COURSE-001; touches `App.tsx`/`LoginPage.tsx` only
3. **UAT-BOOTSTRAP-001** — independent of both; pure scripting/docs, built last so it
   captures whatever the other two stories' `npm run build` behavior actually is by the time
   it's written (no reason to rebuild it if either story changed a build step mid-sprint)

## Technical decisions made at planning (2026-08-23)

* **No ADRs needed this sprint.** All three stories reuse existing tech-stack choices —
  React state + shadcn/ui table (COURSE-001, per ADR-0006), `react-router-dom` navigation +
  the existing session hook (HOME-LOGIN-001, per ADR-0005), and plain shell scripting over
  already-existing `docker-compose`/`npm` commands (UAT-BOOTSTRAP-001) — no new library,
  service, or infrastructure choice is introduced. See each story's own "Technical plan"
  section for the concrete approach.
* COURSE-001's sort stays entirely client-side (no new `sortDir` API param) — the DoD's own
  "no pagination" decision means the full list is already in the browser, so re-sorting it
  in place is simpler than a round trip.

## Cross-cutting gaps carried from the previous sprint's review

Not re-flagging the two gaps already resolved in
`past_sprints/sprint_26_08_23_12_32/review.md` (Playwright tooling claim, QTI network-access
claim) — both were closed out (a follow-up story `E2E-BROWSER-001` exists; the claims were
corrected). Nothing new is flagged at this planning session.
