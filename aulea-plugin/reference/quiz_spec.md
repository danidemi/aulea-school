# Quiz spec

The **quiz** is a QTI 3.0 content package for one CURRICULUM item whose
`didactic_activity` is `prerequisite_assessment_quiz`, `feedback_assessment_quiz`,
`learning_assessment_quiz`, or `summative_assessment_quiz`. It is delivered to students through a
QTI-compatible web app, not read as prose by a human reviewer the way a demo guide or slide deck
is — that changes several conventions this project otherwise applies uniformly to material types,
called out below.

One package per item, at
`material/teacher/quizzes/quiz-<kind>-session-NN-<sequence>/`, where:

- `kind` is the item's `didactic_activity` with its `_assessment_quiz` suffix dropped:
  `prerequisite`, `feedback`, `learning`, or `summative`.
- `session-NN` is the item's enclosing session's `session_number`.
- `sequence` is the item's own `sequence` key in CURRICULUM.

Why a package, not one file: QTI 3.0's binding spec requires a `qti-assessment-test` to reference
every question by `href` to a separate `qti-assessment-item` XML file — a test cannot embed a
question's `itemBody`/`responseDeclaration` inline. There is no spec-valid single-file shape for a
multi-question quiz. Producing one anyway would fail validation against the standard this material
type exists to conform to, defeating the reason to use QTI at all.

The package's directory holds, at minimum:

```
quiz-<kind>-session-NN-<sequence>/
├── imsmanifest.xml
├── test.xml
└── items/
    ├── item-01.xml
    ├── item-02.xml
    └── …
```

---

## Why this document cannot be "verified"

The same limit that applies to every other material type applies here: the authoring agent has no
access to the real cohort, no data on which distractors actually confuse students, and no delivery
app to test the package against (the consuming app, `QTI-22-IMPORT` in the platform's own backlog,
does not exist yet, is not even sprint-ready, and currently targets QTI **2.2**, not the 3.0 this
package is written to — see "Version and packaging are provisional", below).

Every question, distractor, and scoring rule is a grounded guess from the CURRICULUM
item and the DESIGN node(s) it targets, tagged `[stated]` / `[inferred]` /
`[invented framing]` / `[risk]` per `material_authoring_rules.md` — with one change from every other
material type: **a tag never appears inside a student-visible element.** A quiz is the first
material type in this project where the file a human reviews and the content shown to a real
student are the same bytes (student-facing prose lives inside `qti-item-body`, teacher-only
authoring metadata lives outside it, in the same file) — anything a tag would normally sit next to
in an AsciiDoc or YAML file is here rendered directly to the student, so provenance tags and
`instructional_decisions` entries go in an XML comment at the top of each `.xml` file instead
(see "Metadata that must never reach a student", below), never inline in `itemBody`, choice text, or
feedback text.

The agent may run `xmllint --noout <file>` (or an equivalent local, read-only well-formedness
check) on every file it writes, if available in the sandbox — this confirms the XML is well-formed,
not that it validates against the QTI 3.0 schema or that the target app accepts it. Do not claim
schema validation happened when only well-formedness was checked.

## Version and packaging are provisional

This spec targets **QTI 3.0**. The only known consumer, `QTI-22-IMPORT` in the platform's backlog,
targets QTI **2.2** and its own DoD does not yet say whether it expects a single item, a full
content package, or something else — that story is `DRAFT`, not sprint-ready. Until it is groomed,
treat the exact packaging shape here as the best-available guess, not a settled contract: record any
gap between this spec and the eventual real importer as an `instructional_decisions` entry the first
time it is discovered, rather than silently reconciling it.

## imsmanifest.xml

The IMS Content Packaging manifest tying the package together. List `test.xml` and every item file
as `<resource>` entries; `test.xml`'s resource `<dependency>`-references each item resource.

Authoring metadata that is safe to put here (never shown to a student — a delivery app reads a
manifest to import a package, it does not render it as a screen) goes in each resource's own
`<metadata>` block, IMS Content Packaging's standard extension point for exactly this: at minimum,

```xml
<metadata>
  <schema>QTI Item</schema>
  <schemaversion>3.0.0</schemaversion>
  <status>draft</status>          <!-- draft | approved — ONLY a human sets 'approved' -->
</metadata>
```

## test.xml

```xml
<qti-assessment-test identifier="quiz-<kind>-session-NN-<sequence>" title="…">
  <!--
  status: draft
  kind: prerequisite | feedback | learning | summative
  node_ref: <single id, or a list, or "all nodes in the course" for a summative/capstone>
  instructional_decisions:
    - decision: "…"
      rationale: "…"
      confidence: stated | inferred | invented
      awaiting: instructional-designer
  -->
  <qti-test-part identifier="testPart-1" navigation-mode="linear" submission-mode="individual">
    <qti-assessment-section identifier="section-1" title="…">
      <qti-ordering shuffle="true"/>
      <qti-assessment-item-ref identifier="item-01" href="items/item-01.xml"/>
      <qti-assessment-item-ref identifier="item-02" href="items/item-02.xml"/>
      …
    </qti-assessment-section>
  </qti-test-part>
</qti-assessment-test>
```

The leading XML comment is the file's entire authoring-metadata surface: `status`, the item's
`kind`, the DESIGN `node_ref`(s) it targets, and any `instructional_decisions`.
Nothing outside the comment names a node id, a confidence tag, or a review status — all of that
would otherwise sit in a place a rendering engine could plausibly surface to a student.

`<qti-ordering shuffle="true"/>` shuffles question order per delivery attempt — this is a
delivery-time behavior the app applies, not something the agent pre-scrambles by writing items in a
random file order. Default to `shuffle="true"` for every quiz; if a specific kind's pedagogy needs a
fixed order (e.g. a prerequisite check that must ask easier questions first), set `shuffle="false"`
and record why as an `instructional_decisions` entry rather than silently deviating from the
default.

## items/item-NN.xml

One `qti-assessment-item` per question:

```xml
<qti-assessment-item identifier="item-01" title="…" adaptive="false" time-dependent="false">
  <qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="identifier">
    <qti-correct-response>
      <qti-value>choice-b</qti-value>
    </qti-correct-response>
  </qti-response-declaration>
  <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float"/>
  <qti-item-body>
    <qti-choice-interaction response-identifier="RESPONSE" shuffle="true" max-choices="1">
      <qti-prompt>…</qti-prompt>
      <qti-simple-choice identifier="choice-a">…</qti-simple-choice>
      <qti-simple-choice identifier="choice-b">…</qti-simple-choice>
      <qti-simple-choice identifier="choice-c">…</qti-simple-choice>
    </qti-choice-interaction>
  </qti-item-body>
  <qti-response-processing
    template="https://purl.imsglobal.org/spec/qti/v3p0/rptemplates/match_correct"/>
</qti-assessment-item>
```

`shuffle="true"` on the interaction shuffles that question's choice order per delivery attempt —
apply it to every choice-based question by default, same default-on/record-the-exception rule as
question ordering above.

Use the `match_correct` response-processing template for a single-correct-answer question. A
question with more than one correct choice, a numeric/text response, or partial credit needs a
different template or a custom `qti-response-processing` block — reach for the simplest template
that fits before writing custom processing logic, and record the choice as an
`instructional_decisions` entry when a custom rule was necessary.

### Metadata that must never reach a student

Everything a reviewer needs that is not itself part of the question — the `[stated]` /
`[inferred]` / `[invented framing]` / `[risk]` tag for this question's content, and any per-question
`instructional_decisions` entry — goes in an XML comment immediately inside `qti-assessment-item`,
before `qti-response-declaration`:

```xml
<qti-assessment-item identifier="item-01" title="…">
  <!-- provenance: inferred — distractor "choice-c" invented from the node's Requires edge, no
       store states this exact wrong answer as a common misconception -->
  ...
```

Never write a tag inside `qti-prompt`, `qti-simple-choice`, or any feedback element — those render
directly to the student.

### Verbatim honesty for the "I don't know" option

Per DESIGN, a `feedback_assessment_quiz` question (checking knowledge just taught)
should normally offer an explicit "I don't know" / "I haven't understood this yet" choice, scored as
incorrect but distinguishable in review from a wrong guess — this is what lets a trainer tell an
honest gap from a lucky guess or a genuine misconception. Add it as an ordinary `qti-simple-choice`
option, not a special QTI construct; the distinction that matters is instructional, not structural.

## The four kinds, and what each should ask

These paraphrase the pedagogical intent already established when CURRICULUM was
sequenced (`curriculum-sequencer`'s own definition of each `didactic_activity`) — treat
that store's item and the target node(s) as authoritative over this summary if they ever disagree.

- **prerequisite** (`prerequisite_assessment_quiz`) — short, not punitive; easy for a student who
  already has the prerequisite, hard for one who doesn't; direct self-report questions are fine
  ("Have you ever used `curl`? Yes / No"). Typically covers every Baseline a unit or the whole
  course assumes — expect `node_ref` to be an array here, not a single id.
- **feedback** (`feedback_assessment_quiz`) — checks whether the unit/node *just taught* actually
  landed; include the "I don't know" option (above); hard to pass by guessing alone. Typically a
  single `node_ref`.
- **learning** (`learning_assessment_quiz`) — deliberately revisits **not**-recently-completed
  nodes; favor open-ended, context-application, or rephrasing questions over pure recall, to force
  genuine retrieval rather than short-term memorization. `node_ref` is normally an array spanning
  whichever earlier nodes this instance is designed to revisit.
- **summative** (`summative_assessment_quiz`) — the graded final/capstone; harder, plausible-but-false
  distractors are welcome; scope is normally "all nodes in the course" — `node_ref` is typically
  omitted entirely, the same convention reference/curriculum.schema.json already uses for a
  capstone item.

## instructional_decisions

Same convention as every other material type, recorded in the XML comment at the top of `test.xml`
(never split across item files) — any instructional-design call the agent had to make (how many
questions is "enough" for this item's `duration_minutes`, which node in an array gets how many
questions, what counts as a fair "I don't know" scoring rule) is one entry, tagged `confidence` and
`awaiting: instructional-designer`.

## Status

`draft` until a human reviews the package and sets it to `approved`, recorded in the `<metadata>`
block of every resource in `imsmanifest.xml` and mirrored in `test.xml`'s leading comment. The
authoring agent never sets `approved` itself — the same rule every other material type in this
project follows.
