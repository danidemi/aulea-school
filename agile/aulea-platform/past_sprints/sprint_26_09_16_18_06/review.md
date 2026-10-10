# Sprint review — 2026-09-16

## Delivered

* **QUIZ-PACKAGE-STORAGE-001** (Effort 5) — DONE. `.zip` QTI package upload/storage per
  ADR-0010: `quiz_files` table (one row per file), `adm-zip` unzip, `validateQtiPackage`
  extending `server/src/qti/validateQti3.ts` with manifest/test/item-ref/dangling-href
  checks, migration dropping `quizzes.fileData`. Standalone single-item upload keeps working
  (1-row package, no manifest). 140/140 server tests pass.

## Accepted at review

Human tested the app manually and accepted the story as-is. Marked DONE.

## Gap found and closed during review

Human asked whether `server/test-fixtures/qti-samples/` (QTI-UAT-SAMPLES-001) still made
sense given the new package shape. Verified:

* automated tests already assembled the `.zip` in-memory from the loose fixtures at test
  time (no `.zip` ever committed to git) — not a gap, but duplicated across two test files
* real gap: QTI-UAT-SAMPLES-001's fixtures are explicitly meant to be reused for **manual**
  UAT upload through the browser, and nothing produced a real `.zip` file a human could
  attach for the new package path

Fixed same sprint:
* `server/test-fixtures/qti-samples/buildPackage.ts` — single source of truth for the
  package fixture (manifest + entries + zip assembly), replacing the two copy-pasted
  helpers in `validateQti3.test.ts` and `quizzes.test.ts`
* `server/scripts/build-qti-package-fixture.ts` (`npm run build:qti-fixture`) — writes the
  package to gitignored `test-fixtures/qti-samples/.generated/` for manual UAT
* `.gitignore` updated accordingly

## Deliberately excluded (unchanged from sprint plan)

* QUIZ-TAKE-RENDER-001 (Effort 8) — student quiz-taking UI/rendering
* QUIZ-AUTO-EVAL-001 (Effort 5) — auto-scoring of recorded answers

Both still depend on QUIZ-PACKAGE-STORAGE-001, now unblocked.

## New PBIs

None requested at this review.

## Retrospective

See `references/do_and_donts.md`, entry `sprint_26_09_16_18_06`: run a blast-radius check
when a story changes an existing data shape/behavior — search for other stories, scripts, or
fixtures whose DoD/Notes depended on the old shape, not just code call sites. This sprint's
gap (UAT fixtures) was caught only because the human asked directly at review, not during
grooming or planning.
