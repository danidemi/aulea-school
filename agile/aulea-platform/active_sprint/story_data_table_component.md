ID: DATA-TABLE-001

Status: READY

Priority: Medium

Effort: 8

As:
a `Trainer`

I want to:
click the header of any column in any table to sort its rows

So that:
I find a row quickly, and every table in the platform behaves the same way without each screen having to ask for it (sprint retrospective 2026-10-18)

Definition of Done:
* a shared, reusable `Data Table` component exists in the client; it renders the header row and body rows and provides the sorting behaviour below, so a screen does not implement sorting itself
* clicking a column header cycles that column through ascending, descending, and back to the original row order; the active column and direction are shown in the header and exposed to assistive technology (`aria-sort`); the headers are reachable and operable by keyboard
* sorting one column resets the sort of the previous column; only one column is sorted at a time
* a column can be declared not sortable (e.g. an actions column); sorting compares values by their type (text, number, date), not always as text
* every existing table in the client is migrated to the `Data Table`. Tables found by grepping the client on 2026-10-18, all to migrate: `QuizSessionHistoryPage`, `CourseDashboardPage`, `QuizSessionMonitorPage`, `components/QuizzesSection`. `components/ui/table.tsx` is the low-level shadcn primitive; `Data Table` wraps it. Planning re-greps before starting, in case a table was added since
* a table that is deliberately not sortable has a written reason in this PBI
* the existing unit and e2e suites stay green; component tests in given / when / then style cover the three sort states, a non-sortable column, and typed comparison
* verified automatically (component tests) and with a real-browser screenshot of at least two migrated tables, one sorted ascending and one descending, attached under `assets/DATA-TABLE-001/`
* `references/ubiquitous_language.md` has an entry for `Data Table`; `db-seed.ts` is unaffected (no API change)

Implementation plan (sprint planning, 2026-10-18):
* ADR check: ADR-0006 (shadcn/ui components are copied in and owned). `Data Table` is a new component in `client/src/components/DataTable.tsx` that builds on the existing primitives in `components/ui/table.tsx`; the primitives stay as they are. No new ADR, no new dependency (no TanStack Table: four small client-side tables do not justify it).
* API: `<DataTable columns rows getRowKey onRowClick? />`. A column is `{ id, header, cell(row), sortValue?(row), type?: 'text' | 'number' | 'date', sortable?: boolean }`; no `sortValue` means not sortable (an actions column just omits it). Sorting is internal state (`{ columnId, direction } | null`), cycle asc, desc, original order, one column at a time. Comparison by type: text with `localeCompare`, number numeric, date by timestamp; `null` / missing values go last in both directions.
* Accessibility: the header cell carries `aria-sort` (`ascending`, `descending`, `none`) and holds a real `<button>`, so Tab and Enter / Space work; the arrow is `aria-hidden`.
* Plain variant: the Quiz Session Monitor's results table was deliberately left as plain markup (TABLE-STYLE-001) because the shared framing broke its alignment inside its `Card`. The `DataTable` takes a `variant="plain"` that renders the same sortable header without the left bar, the header background and the zebra rows, so that table is migrated too and no table keeps a "not sortable" exception.
* Tables found by grep (2026-10-18) and what changes:
  * `CourseDashboardPage`: already has its own click-to-sort (three states, arrow, `compareCourses`), but no `aria-sort`, and string-only comparison. Its hand-rolled state and `compareCourses` are deleted; `Created` / `Last updated` become `date` columns.
  * `QuizSessionHistoryPage`: no sorting today (checkbox column, Status, Started, Stopped, Joined / Submitted). Checkbox column not sortable; Started / Stopped sort as dates (`not started yet` is a missing value); Joined / Submitted sorts by the joined count.
  * `components/QuizzesSection`: no sorting today (Title, Uploaded, Status, Actions). Actions not sortable; Uploaded as date.
  * `QuizSessionMonitorPage` results table: `variant="plain"`, `Student (connection)` as text, `Score` sorts by `totalScore`.
* UX pattern grep result: sortable headers exist only in `CourseDashboardPage`; no other screen has them. Covered by this PBI: all four tables above. Deferred: none.
* Tests (given / when / then): `DataTable.test.tsx` for the three states, a non-sortable column, text / number / date comparison, missing values last, keyboard operation and `aria-sort`. Existing page tests stay green; update only the selectors that the move changes.
* Evidence: Playwright screenshots against the e2e stack: courses list sorted ascending and quiz sessions list sorted descending (plus one of the monitor results table), attached under `assets/DATA-TABLE-001/`. Run the whole Playwright suite on the built server on its own port, as in the do_and_donts.
* Glossary: `Data Table` is already there; check its wording against the final API.
* `db-seed.ts` unaffected (no API change).
