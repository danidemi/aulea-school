ID: COURSE-001

As:
a `trainer`

I want to:
see a dashboard listing all courses in my current tenant, sort that list, create a new course
from it, and select one course from it to work on

So that:
I can find, start, and switch between the courses I manage, all from one screen

Definition of Done:
* dashboard shows all courses of my `current tenant`
* sortable by title/creation date/last-update date via clicking the column header, standard
  tri-state cycling (asc → desc → unsorted) with a visible direction indicator on the active
  column (rejected at first sprint review as a "Sort by" dropdown; reworked to column-header
  click-to-sort per this DoD before being accepted)
* "New course" opens a form for the course name; two courses in the same tenant can't share a
  name (uniqueness scoped to tenant)
* clicking a row selects it as `current course`, shown in a breadcrumb
* no pagination (all courses load at once); friendly empty state when the tenant has none
* out of scope: uploading slides/quizzes, editing, deleting

Implemented (sprint, 2026-08-22, reworked 2026-08-23):
* `GET /api/courses`/`POST /api/courses` require a session; sorting is computed client-side by
  re-sorting the already-loaded list (no server-side sort param)
* extracted shared `AppHeader` (`client/src/components/AppHeader.tsx`) and `useSignedInUser`
  hook (`client/src/lib/session.ts`) out of `App.tsx`, reused by `SignUpPage`/`LoginPage`
* 52/52 server tests, 43/43 client tests after rework; `npm run build` clean
* manual verification against a disposable server: two tenants can each create "Advanced SQL"
  (409 only within the same tenant), sorting/breadcrumb confirmed via real API
