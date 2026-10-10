ID: QTI-22-IMPORT

As:
a `trainer`

I want to:
upload a quiz in QTI-22 format

So that:
I can then later submit the quiz to the students

Definition of Done:
* select a local QTI 2.2 file and upload it
* the file is checked for format; a bad format is reported with an error
* the quiz appears in the quiz dashboard

Implemented (sprint, 2026-08-22):
* validation is structural only (well-formed XML, correct root element in the QTI 2.2
  namespace, required `identifier`/`title`, `itemBody` presence) — not full `imsqti_v2p2.xsd`
  validation (no network access to fetch the schema); all errors returned together with real
  line numbers via a streaming XML parser (`sax`) — `server/src/qti/validateQti22.ts`
* quiz title comes from the file's own `title` attribute, not the filename
* `PUT .../file` (replace) does not run this validation, only `POST` (create) does
* 78/78 server tests, 41/41 client tests
* manual verification against a disposable server: valid upload creates the row with the
  file's title; missing-identifier and malformed-XML uploads both 400 with structured errors
  and create nothing
* superseded by QTI3-MIGRATION-001 the same sprint block (hard cutover to QTI 3.0)
