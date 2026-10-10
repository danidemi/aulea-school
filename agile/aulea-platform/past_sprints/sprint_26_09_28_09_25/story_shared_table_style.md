ID: TABLE-STYLE-001

Status: DONE — accepted at sprint review 2026-09-28

Implemented (2026-09-27): `client/src/components/ui/table.tsx` (ADR-0006 copy-in — `Table`,
`TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell`), bakes in the left accent bar,
full width, a white background, light-gray/bold header, sessions-table padding, and zebra-striped
body rows (`even:bg-ink-50`, on white — the initial `even:bg-ink-50/40` over the page's own `bg-paper`
was nearly invisible, caught at self-review before this was reported done). Row-hover on the two
clickable tables (courses, sessions list) uses `hover:bg-brass-50` instead of the old
`hover:bg-ink-50`, since that would no longer show up against an already-`bg-ink-50` even row.
Used by `CourseDashboardPage`'s courses table, `QuizzesSection`'s quiz table, and
`QuizSessionHistoryPage`'s sessions table (its old `<Card>` wrapper removed — the accent bar is now
the table's own). `QuizSessionMonitorPage`'s Block #3 results table was left as plain markup, not
migrated to the shared primitives — it's a small summary widget inside its own `Card`, aligned
against the "Results"/"Class average" text right above it in the same panel; an earlier attempt at
migrating it misaligned its padding against those siblings and doubled up on the Card's own
framing. `CourseDashboardPage` and `CourseDetailPage`'s `max-w-3xl`/`mx-auto` wrappers were both
removed so their tables fill width like the sessions table, per the DoD (caught on
`CourseDashboardPage` only at self-review — the first pass only fixed `CourseDetailPage`). This also
moves those two pages' "+ New course"/"Upload quiz" buttons to the far left, since they shared the
same wrapper — flagging that side effect for review, not treating it as obviously fine. No `<table>`
usage in `client/src` was left un-migrated (grepped after the change). Full unit suite green (220
server / 104 client tests — no test asserted on the old raw `<table>` markup) and the full existing
Playwright e2e suite green (13/13, no regressions). Verified end-to-end against the real built app
with 3 courses and 3 sessions (so zebra striping is actually visible, not just asserted in markup),
both light and dark `colorScheme` — screenshots in `assets/TABLE-STYLE-001/` alongside the original
reference images: [`courses-light.png`](assets/TABLE-STYLE-001/courses-light.png),
[`course-detail-light.png`](assets/TABLE-STYLE-001/course-detail-light.png),
[`sessions-list-light.png`](assets/TABLE-STYLE-001/sessions-list-light.png) (dark counterparts
alongside each).

Priority: Medium

Effort: 5

As:
a `trainer` (and the team maintaining the UI)

I want to:
every table in the app (quiz list, sessions list, and any future one) to share one consistent
visual style, defined in exactly one place

So that:
the app looks coherent instead of each table looking hand-rolled, and a future style change (e.g.
"make headers bolder") is a single edit instead of finding and fixing every table separately

Definition of Done:
* a single shared table component (decided with the human at sprint planning, 2026-09-27: a shared
  React component, not shared CSS classes — copy shadcn/ui's `table.tsx` into
  `client/src/components/ui/`, per ADR-0006's copy-in convention, and bake the resolved style
  decisions below into it) is introduced and used by all existing tables, at minimum
  the quiz list (`client/src/components/QuizzesSection.tsx`) and the sessions list
  (`client/src/QuizSessionHistoryPage.tsx`), plus any other `<table>` usage found in
  `client/src/CourseDashboardPage.tsx` / `client/src/QuizSessionMonitorPage.tsx`
* the resulting single style resolves the concrete inconsistencies the user flagged between the
  two reference screenshots. Decided with the human (2026-09-27):
  * tables fill the available width, like today's sessions table, not the quiz table's
    centered/contained layout
  * the sessions table's left accent bar (colored strip framing the whole table) is kept and
    becomes part of the shared style, applied to every table — not dropped for a plainer look
  * table body rows get alternating background colors (zebra striping) — new, not present in
    either current variant, requested by the human during this grooming pass
  * header background/typography: adopt the quiz table's header as-is (light-gray background, bold
    dark text) — decided with the human, 2026-09-27
  * cell/action padding: adopt the sessions table's padding (already reads correctly at full
    width) — decided with the human, 2026-09-27
* no table-specific CSS/layout is duplicated per page after this change; a future table added to
  the app can reuse the shared style without re-authoring it
* verification: manual — screenshot of at least two tables (quiz list and sessions list) after the
  change, in both light and dark color-scheme, showing both now share the same header/row/padding
  style (per `do_and_donts.md`'s sprint_26_09_19 DON'T: visual/CSS defects have twice escaped
  because only one color scheme was checked)

Note:
Reference screenshots attached by the user, showing the two current inconsistent styles:
* quiz table (centered, doesn't fill width, light header, bordered action buttons):
  [`assets/TABLE-STYLE-001/current-quiz-table-centered-bordered-buttons.png`](assets/TABLE-STYLE-001/current-quiz-table-centered-bordered-buttons.png)
* sessions table (full width, left accent bar, different padding/header):
  [`assets/TABLE-STYLE-001/current-sessions-table-full-width-accent-bar.png`](assets/TABLE-STYLE-001/current-sessions-table-full-width-accent-bar.png)

User's own words: "each table style has pro and cons but none is right". All resolved-style
decisions above (width, accent bar, zebra striping, header, padding) were made with the human at
this grooming session, 2026-09-27.

Implementation plan (sprint planning, 2026-09-27, see `active_sprint/sprint.md`):
* Copy shadcn/ui's `table.tsx` into `client/src/components/ui/` (ADR-0006), replacing its default
  Tailwind tokens with this project's own (`ink`/`paper`/`brass`/`border` — an unmapped class fails
  silently, so check `tailwind.config` while porting).
* Bake in: full width; left accent bar (from the sessions table's current markup) on every table;
  zebra striping via `even:` on body rows; header style from the quiz table (light-gray background,
  bold dark text); cell/action padding from the sessions table.
* Grep the whole `client/src` for `<table` (not just the four files named in the DoD) and migrate
  every hit found, keeping native `<table>`/`<tr>`/`<td>` roles so existing tests keep finding them.
* Verification: screenshot quiz list + sessions list, in both light-preference and
  `colorScheme: 'dark'` Playwright contexts — the app stays visually pinned to light either way, per
  the PBI's own DoD and `do_and_donts.md`'s sprint_26_09_19 DON'T.
