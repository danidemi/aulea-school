# Student book spec

Covers the student book: one AsciiDoc file per CURRICULUM session, learner-facing only. Read
`design/material_authoring_rules.md` first; this file covers what is specific to the student
book.

One file per session, written by `student-book-author`:

- `material/student/books/session-NN-student-book.adoc` — every item in that CURRICULUM
  session, in sequence order, sectioned internally by item. No answers, no answer keys, no
  facilitation notes, no solution walkthroughs, no rubric scoring nuance — see "Access-control
  rule" below.

## Access-control rule (read this before writing anything)

A file's tree membership is its access-control signal. `material/student/` is distributed to
learners. Nothing that would give away an answer, a graded solution, or facilitation guidance may
sit in this file. Concretely, in a student book:

- Explain a concept, describe an exercise's goal and steps, state what a checkpoint checks —
  never state the checkpoint's correct answer or the rubric's pass/fail scoring detail.
- Link to a session's other student-facing companion files by path (student quiz paper, hands-on
  solving guide, project work brief, reading guide, rubric — rubrics are student-facing per
  `.claude/reference/material_catalog.md`, students are scored against the exact rubric they can
  read).
- Never link to a teacher-only file (teacher book, quiz answer key, demo script, hands-on setup
  guide, project work facilitation notes). If you find yourself about to write a path under
  `material/teacher/`, stop — that reference does not belong in this file.
- If a lesson item's `notes` or `rubric` field in CURRICULUM contains something a student should
  not see verbatim (a scoring nuance, an instructor-only caveat), summarize only the learner-facing
  part or omit it; do not copy the field wholesale into the student book.

## Document header

```asciidoc
= Session 1 — Deploying the Gateway and Splitting Traffic
:status: draft
:session: 1
:covers_items: 1,2,3,4,5,6,7,8,9,10
:source_curriculum: design/curriculum.json
:source_design_graph: design/knowledge_goals_graph.json
:sectnums:
:toc:

[instructional_decisions]
====
* Decision: …
  Rationale: …
  Confidence: stated | inferred | invented
  Awaiting: instructional-designer
====
```

`:status:` is the AsciiDoc document attribute holding the draft/approved gate (see
`material_authoring_rules.md`). `:covers_items:` lists the `sequence` keys of every CURRICULUM
item this file compiles, in order — the same audit trail role the quiz spec's `node_ref` header
plays for a single-item file. Omit the `instructional_decisions` block entirely when there is
nothing to record for this session.

## Body: one section per lesson item

One top-level section per CURRICULUM item in the session, in `sequence` order. Each section is
headed by the item's `node_ref` and title, so a reader can trace any paragraph back to a specific
graph node:

```asciidoc
== PRQ-STRANGLER-FIG-PATTERN — The strangler-fig migration pattern

[stated]
The strangler-fig pattern lets a legacy system and its replacement run side by side, with traffic
gradually moved from the old system to the new one until the old system can be retired.

[inferred]
This is the framing the rest of this session builds on: every gateway feature covered later exists
to make that gradual traffic move possible.

=== What to expect

This is a lecture-discussion: the instructor presents the pattern and stops for questions about
where your own systems might fit this shape.

=== Companion files for this item

* Reading: (see this item's `support_material` entry of `kind: reading`, once produced)
```

For a `hands_on_practical` or `project_based` item, add a subsection pointing at the paired
student-facing file instead of describing exercise steps in full — the solving guide or project
brief is the single source for exercise mechanics, the book should not fork a second copy that can
drift out of sync:

```asciidoc
=== Hands-on exercise

Follow `material/student/hands-on/session-01-PRQ-CONTAINERIZE-GATEWAY-solving-guide.adoc` for the
exercise steps. This section only frames why the exercise matters here.
```

For a `checkpoint` or `assessment` item, describe what is being checked and point to the student
quiz paper and the rubric — never state the answer or the rubric's scoring detail:

```asciidoc
=== Checkpoint

This checkpoint confirms you can route a request correctly between the legacy system and a
migrated service. Take the quiz at
`material/student/quizzes/session-01-DR-STRANGLER-ROUTING-quiz-assessment.md`; you are scored
against `material/student/rubrics/session-01-DR-STRANGLER-ROUTING-rubric.md`.
```

Allowed cross-references, all student-facing:

| CURRICULUM item property | Student book points to |
|---|---|
| `support_material[].kind: reading` | `material/student/reading-guides/session-NN-<node_ref>-reading-guide.md`, once it exists |
| `style: hands_on_practical` | `material/student/hands-on/session-NN-<node_ref>-solving-guide.adoc` |
| `style: project_based` | `material/student/project-work/session-NN-<node_ref>-project-work.adoc` |
| `item_type: checkpoint` / `assessment` with a quiz | `material/student/quizzes/session-NN-<node_ref>-quiz-<kind>.md` |
| non-empty `rubric` | `material/student/rubrics/session-NN-<node_ref>-rubric.md` |

Do not invent a companion file's path ahead of it existing as a concrete guess — phrase it as
"once produced" or a `[placeholder]` note (per `material_authoring_rules.md`'s "Honest gaps")
if the orchestrating skill has not yet generated that file this run.

## Deriving section content

- A lesson item's explanation traces to the target node's `description` in DESIGN — the same
  source the quiz spec uses for `prereq-check`/`engagement` questions.
- A checkpoint/assessment item's framing (what is being checked, why) traces to the CURRICULUM
  item's own text (`title`, `notes`) plus the DESIGN node's `description` — never to the `rubric`
  field's scoring detail.
- If DESIGN gives conflicting or thin detail for a node, write what is there and tag the gap
  `[risk]` inline rather than inventing plausible-sounding depth.
- Tag anything beyond a direct restatement of a store fact with `[stated]` / `[inferred]` /
  `[invented framing]` / `[risk]` inline, per `material_authoring_rules.md`.

## Status and the approval gate

`:status: draft` until a human reviews the file. Only a human sets `:status: approved` —
`student-book-author` never sets it itself. The teacher book and the student book for the
same session are independent files with independent gates; approving one does not approve the
other.
