ID: ROUTE-ID-GUARD-001

As:
a `trainer` (and, by extension, every other tenant sharing the same running server)

I want to:
a malformed course id in a URL to be rejected with an ordinary error response, not crash the
entire server process for everyone currently using it

So that:
one bad request from one user can't take the platform down for every other signed-in user

Definition of Done:
* a non-UUID course id under any `/api/courses/:courseId...` route returns 404 (same shape as
  "course not found", so a caller can't distinguish malformed from nonexistent), and the
  server process does not crash
* every route calling course-lookup-by-id-from-param is audited and fixed, not just the one
  found — confirmed exactly 2 call sites: `quizzes.ts`'s `authorizeCourse` (unguarded, crashed)
  and `courses.ts`'s `GET /api/courses/:courseId` (already caught, but returned 500 not 404)
* fake repositories throw the same shape real Postgres does for a non-UUID id, so the bug's
  failure mode is actually exercised by fast in-memory tests

Implemented (sprint, 2026-08-23):
* found during COURSE-DETAIL-001's manual verification: a non-UUID course id made Postgres
  raise `22P02`, uncaught, crashing the whole Node process
* `server/src/db/errors.ts` (`isInvalidIdError`, mirrors `db/users.ts`'s `isUniqueViolation`);
  both call sites now try/catch the lookup and return 404 for an invalid-id error, 500 for
  anything else, instead of letting either propagate
* `testSupport/fakes.ts`: `createFakeCourseRepository` now generates real UUID-shaped ids and
  throws the wrapped `22P02` shape for a non-UUID id — this is what lets a unit test actually
  exercise the crash-prevention path
* 91/91 server tests green (2 new regression tests); `npm run build` clean
* manual verification on an isolated disposable instance: the exact original repro
  (`GET /api/courses/does-not-exist/quizzes`) now returns 404, and an immediately following
  request is still served with nothing unusual in the log
