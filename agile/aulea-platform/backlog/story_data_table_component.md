ID: DATA-TABLE-001

Status: DRAFT

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
* every existing table in the client is migrated to the `Data Table`; before implementation, grooming or planning lists all tables found by grepping every screen, and the PBI states which ones are migrated
* a table that is deliberately not sortable has a written reason in this PBI
* the existing unit and e2e suites stay green; component tests in given / when / then style cover the three sort states, a non-sortable column, and typed comparison
* verified automatically (component tests) and with a real-browser screenshot of at least two migrated tables, one sorted ascending and one descending, attached under `assets/DATA-TABLE-001/`
* `references/ubiquitous_language.md` has an entry for `Data Table`; `db-seed.ts` is unaffected (no API change)
