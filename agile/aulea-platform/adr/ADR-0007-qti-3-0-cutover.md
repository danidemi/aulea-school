# ADR-0007: Standardize quiz import on QTI 3.0, hard cutover from QTI 2.2

## Status

Accepted (sprint planning, 2026-08-23)

## Context

`QTI-22-IMPORT` (past sprint) shipped structural validation/storage for QTI 2.2
(`assessmentItem`/`assessmentTest`, namespace `imsqti_v2p2`). The human asked, while
reviewing a follow-up UAT-samples story, to move the platform to QTI 3.0 instead: QTI 3.0
has off-the-shelf, HTML5-friendly "player" libraries capable of actually running a quiz for
a student, which QTI 2.2 does not offer as readily. No student-facing quiz-delivery/player
story exists yet, so this ADR does not adopt a player library — it only changes which QTI
version the upload/validation path accepts.

That "player libraries exist and are HTML5-friendly" claim is the stated motivation but has
not been independently verified against the current library landscape by this team — it is
recorded here as the decision's rationale, and re-flagged as needing verification before
whichever future story actually adds playback.

## Decision

* The platform validates and stores **QTI 3.0** quiz files
  (`qti-assessment-item`/`qti-assessment-test` root elements, QTI 3.0 namespace), not QTI
  2.2.
* This is a **hard cutover**, not dual support: a QTI 2.2 file uploaded after this ships is
  rejected the same way any other wrong-namespace file is. No migration path is offered for
  QTI 2.2 files already stored from `QTI-22-IMPORT` (none exist yet outside test fixtures —
  the feature had no real trainer-authored content by this point).
* Scope stays validation/storage parity with `QTI-22-IMPORT`'s original scope: accept,
  validate, store, list. Adopting a QTI 3.0 player library and wiring up actual quiz
  delivery is explicitly out of scope for this decision.

## Consequences

* `server/src/qti/validateQti22.ts` and its route wiring in `server/src/routes/quizzes.ts`
  are replaced by a QTI-3.0-shaped equivalent; the client's QTI-2.2-specific error copy
  (`QuizDashboardPage.tsx`) is updated to say QTI 3.0.
* No dual-format code path to maintain — simpler than a soft migration, at the cost of
  invalidating any QTI 2.2 file a trainer may have uploaded before this ships (accepted:
  none exist outside test fixtures).
* `QTI-UAT-SAMPLES-001` (blocked on this ADR/story) is written against QTI 3.0 samples only.
* A future quiz-delivery story must independently confirm which QTI 3.0 player library (if
  any) to adopt — not decided here.
