# Sprint plan — started 2026-09-13

## Scope

Smallest subset per CLAUDE.md's default — 1 of 3 newly-groomed READY stories, the one
nothing else in the chain can proceed without.

1. **QUIZ-PACKAGE-STORAGE-001** — store a full QTI package (manifest + test + item files),
   not just a single file, per quiz (Effort 5).

Deliberately excluded from this sprint (both READY, both depend on this story):
* **QUIZ-TAKE-RENDER-001** (Effort 8) — student quiz-taking UI/rendering.
* **QUIZ-AUTO-EVAL-001** (Effort 5) — auto-scoring of recorded answers.

## Technical decisions (new ADR this sprint)

* **ADR-0010** — QTI package upload/storage: single `.zip` upload (existing
  `multer.memoryStorage()` upload pattern, new accepted file type), unzipped in-memory via
  `adm-zip`, stored as a new `quiz_files` table (one row per file, tenant-scoped via join
  like `quiz_sessions`). `quizzes.fileData` is dropped in the same migration — every quiz
  becomes "a package," a standalone single-item upload being a 1-row package with no
  manifest.

Grounded against existing ADRs: PostgreSQL persistence (ADR-0002), Drizzle ORM/migrations
(ADR-0003), QTI 3.0 validate/store scope (ADR-0007) — this story extends that scope to
packages, additively from the trainer's point of view.

## Per-story technical plan

See `story_qti_package_storage.md`'s own "Technical plan (sprint planning, 2026-09-13)"
section, pointing to ADR-0010.

## Known accepted gaps, flagged now rather than discovered at review

* This story only makes packages storable/retrievable — no student-facing rendering exists
  yet (QUIZ-TAKE-RENDER-001, next sprint candidate).
* The QTI 3.0 player library question (ADR-0007's original open item) is *not* decided by
  this sprint — options were researched and recorded on QUIZ-TAKE-RENDER-001's backlog entry
  for whenever that story is picked up.
