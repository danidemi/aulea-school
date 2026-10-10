# ADR-0010: QTI package upload format and storage shape

## Status
Accepted — 2026-09-13 (sprint planning for QUIZ-PACKAGE-STORAGE-001)

## Context
`quiz-author` (the course-authoring plugin) writes a QTI 3.0 package as a folder:
`imsmanifest.xml`, `test.xml` (a `qti-assessment-test`), and one `items/item-NN.xml` per
question, with `test.xml` referencing each item file by `qti-assessment-item-ref href="..."`.
The current upload path (`POST /api/courses/:courseId/quizzes`, `server/src/routes/quizzes.ts`)
accepts exactly one file via `multer.memoryStorage()` and stores its bytes in a single
`quizzes.fileData` bytea column (ADR-0002). A package's item files, referenced only by
relative href, have nowhere to be stored — QUIZ-TAKE-RENDER-001 cannot resolve them.

## Decision
* **Upload format: a single `.zip` archive** containing the package folder's contents,
  uploaded through the same single-file `multer.memoryStorage()` pattern already used today
  (no new upload mechanism, just a different accepted file type/extension). A trainer zips
  the folder the plugin produced and uploads that one file — no browser directory-upload UX
  needed.
* **Zip handling: `adm-zip`** (npm), read directly from the in-memory `Buffer` `multer`
  already provides — no temp files on disk, consistent with today's memoryStorage-only
  upload path. Chosen over a streaming unzip library (e.g. `unzipper`) because these
  packages are small (a handful of short XML files per quiz) and a synchronous, in-memory
  read keeps the route handler simple; no need for streaming's complexity at this scale.
* **Storage shape: a new `quiz_files` table**, one row per file —
  `quiz_files(id uuid pk, quizId fk → quizzes.id, relativePath text, fileData bytea,
  mimeType text, createdAt)`. Every quiz becomes "a package": a standalone single
  `qti-assessment-item` upload (today's only supported shape) becomes a 1-row package with
  no manifest, not a special case. `quizzes.fileData` is dropped — file bytes live only in
  `quiz_files` from this point on, via a Drizzle migration (ADR-0003's `drizzle-kit
  generate`/`migrate`).
* Package validation (`server/src/qti/validateQti3.ts`) is extended to resolve every
  `qti-assessment-item-ref href` in `test.xml` against the zip's own entries before any row
  is written — an unresolvable href rejects the whole upload with the existing 4xx
  validation-failure shape, no partial store.

## Consequences
* `server/package.json` gains `adm-zip` (plus `@types/adm-zip` as a dev dependency).
* `server/src/db/schema.ts` gains `quiz_files`; `quizzes.fileData` is removed in the same
  migration — any code reading `quizzes.fileData` directly (quiz file download) is updated to
  read the manifest-less single-file case as `quiz_files` with one row instead.
* `QuizRepository` (`server/src/db/quizzes.ts`) gains file-package read/write methods scoped
  by `quizId`, following the existing tenant-scoped-via-join pattern (`quizId → courses.id →
  tenants.id`) — no denormalized tenant column on `quiz_files`, consistent with
  `quiz_sessions`/`quiz_session_connections`.
* A malformed zip (not a valid archive, missing `imsmanifest.xml`/`test.xml`, or a dangling
  item-ref) is rejected before any `quiz_files` row is written.
* QUIZ-TAKE-RENDER-001 (future story) reads a session's quiz item files from `quiz_files` by
  relative path, resolved from `test.xml`'s item-refs — no change needed to this decision
  when that story starts.
