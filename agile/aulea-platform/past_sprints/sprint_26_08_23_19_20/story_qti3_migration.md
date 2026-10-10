ID: QTI3-MIGRATION-001

As:
a `trainer` (and, by extension, the students who will eventually take these quizzes)

I want to:
the platform to accept and validate quizzes in QTI 3.0 format instead of QTI 2.2

So that:
the platform can later use QTI 3.0's off-the-shelf "player" libraries to actually deliver a
quiz to a student

Definition of Done:
* hard cutover: the QTI 2.2 validator is replaced (not dual-supported) with one that validates
  QTI 3.0's namespace/root elements; a QTI 2.2 upload after this is rejected like any other
  malformed file
* same accept/validate/store/list flow as QTI-22-IMPORT, ported to the new format
  (validation/storage parity only — no player library, no playback, this sprint)
* ADR recorded for the version-move rationale (player libraries, HTML5-friendliness — not
  independently verified against the spec, flagged for whoever adds playback)

Implemented (sprint, 2026-08-23):
* `adr/ADR-0007-qti-3-0-cutover.md`; `server/src/qti/validateQti3.ts` replaces
  `validateQti22.ts` (root elements `qti-assessment-item`/`qti-assessment-test`, namespace,
  `qti-item-body`) — same structural-only validation scope as the 2.2 version
* `server/src/routes/quizzes.ts` swapped to `validateQti3`; upload-error copy updated
* 79/79 server tests, 47/47 client tests, including a QTI 2.2 file now rejected as wrong root
  element (confirms the hard cutover)
* manual verification (after QTI-UAT-SAMPLES-001 produced fixtures): all 3 accept files → 201
  and listed, all 3 reject files → 400 with nothing created
