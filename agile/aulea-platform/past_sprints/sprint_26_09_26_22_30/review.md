# Sprint review — 2026-09-26

All 6 planned PBIs accepted as `DONE`:

* `BUG-ANSWER-BREAKDOWN-MULTISELECT`
* `BUG-ANSWER-BREAKDOWN-BAR-MISALIGN`
* `TESTDATA-001` — verified end-to-end via a new `scripts/seed.sh` wrapper (next to
  `scripts/uat.sh`) around the existing `npm run db:seed`; found and fixed a real integration bug
  in `server/scripts/db-seed.ts` in the process (it called the pre-`QUIZ-SESSION-PER-STUDENT-
  DELIVERY-001` items endpoint shape, missing the new required `connectionId` path segment).
* `QUIZ-SESSION-PER-STUDENT-DELIVERY-001`
* `QUIZ-RANDOM-QUESTION-ORDER-001`
* `QUIZ-RANDOM-ANSWER-ORDER-001`

## Observed

* The cross-cutting behavior change flagged in `sprint.md` (already-authored `shuffle="true"`
  quizzes start shuffling per-student the moment a trainer starts a new session, with no trainer-
  facing UI change) shipped as PO-approved — no action needed, but worth remembering if it
  surprises a trainer post-release.
* `CLAUDE.md` updated: any future change that adds a new entity kind or changes an API shape
  `server/scripts/db-seed.ts` relies on must update that seed script in the same change, so it
  doesn't silently drift out of date the way it just did here.
