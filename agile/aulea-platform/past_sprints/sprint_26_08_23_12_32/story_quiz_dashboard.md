ID: QUIZ-DASHBOARD-001

As:
a `trainer`

I want to:
see a dashboard listing the quizzes belonging to my `current course`

So that:
I can confirm a quiz I uploaded is stored, and find it again later

Definition of Done:
* lists quizzes of the `current course`: title, upload date, status
* delete a quiz row (removes row + stored file); re-upload/replace a file without a new row
* no sort/filter/assign-to-students in this story; a quiz appears in the list without reload
  after QTI-22-IMPORT uploads it

Implemented (sprint, 2026-08-22):
* no create route in this story — creating a quiz is QTI-22-IMPORT's job; `QuizRepository`
  exposed for it to call directly
* raw quiz files stored as Postgres `bytea` (`quizzes.file_data`), per ADR-0002
* every route requires a session and tenant-owned course (`findByIdForTenant`); cross-tenant
  and non-existent course both 404 (can't be used to probe existing ids); no session → 401
* 62/62 server tests, 38/38 client tests
* manual verification against a disposable server: list/replace/delete all confirmed via real
  API + `psql` (delete actually removes the row)
