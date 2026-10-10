ID: QTI-UAT-SAMPLES-001

As:
a `human running UAT`

I want to:
a small set of ready-made QTI 3.0 quiz files to upload during human-led UAT — some accepted,
some rejected

So that:
UAT can exercise the real upload/validation path with representative files

Definition of Done:
* 3 valid QTI 3.0 samples (single-choice item, multiple-choice item, multi-item test) and 3
  invalid ones (malformed XML, wrong root element, missing required attribute)
* file names unambiguously state sample/kind/expected outcome
  (`sample-accept-single-choice-basic.xml`, `sample-reject-missing-identifier.xml`, ...)
* files live at `server/test-fixtures/qti-samples/`
* depends on QTI3-MIGRATION-001 shipping first

Implemented (sprint, 2026-08-23):
* all 6 files at `server/test-fixtures/qti-samples/` per the naming convention; the
  wrong-root-element reject file is QTI-2.2-shaped, doubling as QTI3-MIGRATION-001's
  hard-cutover-rejection test case
* `validateQti3.test.ts` reads each fixture directly and asserts the intended outcome; 85/85
  server tests green
* manual verification: uploaded all 6 through the real API — all 3 accept files 201'd and
  listed, all 3 reject files 400'd with nothing created
