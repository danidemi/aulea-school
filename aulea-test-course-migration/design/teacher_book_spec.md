# Teacher book spec

Read `design/material_authoring_rules.md` first; this file covers what is specific to the
teacher book.

One file per CURRICULUM session, written by `teacher-book-author`:

- `material/teacher/books/session-NN-teacher-book.adoc`

The file compiles **every** item in that CURRICULUM session — any `item_type`, any `style` — in
the session's own sequence order. It is not one file per lesson item; it is one file per session,
sectioned internally per item.

## Why AsciiDoc, and why one file per session

Long-form prose with internal structure (title, per-item sections, cross-references) is the same
shape `tools/slides/` favors a structured format for, but here the reader is a human working
straight through a session, not a build tool — AsciiDoc gives headings, cross-references, and
admonition blocks without a rendering step. One file per session, not per item, because a
teacher runs a whole session in one sitting and needs one document to hold open, not one file per
lesson to juggle.

## Document header

```asciidoc
= Session 1 Teacher Book — Deploying the Gateway and Splitting Traffic (Strangler Routing)
:status: draft
:session: 1
:course: Spring Cloud Gateway for a Strangler-Fig Migration to GKE
:toc:

[instructional_decisions]
====
* Decision: "..."
  Rationale: "..."
  Confidence: stated | inferred | invented
  Awaiting: instructional-designer
====
```

- `:status:` is `draft` or `approved`, per `material_authoring_rules.md`. Only a human sets
  `approved`.
- `:session:` and `:course:` name the CURRICULUM session this file compiles, so a reader can trace
  the whole file back to `design/curriculum.json` without opening it.
- The `instructional_decisions` block sits right after the title, before the first item section.
  Omit the block entirely when there is nothing to record — do not leave an empty block as a
  placeholder.

## Per-item section

One section per CURRICULUM item in that session, in `sequence` order, headed by the item's
`node_ref` and `title` (or `capstone` and `title` for an item that carries `covers_node_refs`
instead of `node_ref`):

```asciidoc
[[PRQ-STRANGLER-FIG-PATTERN]]
== PRQ-STRANGLER-FIG-PATTERN — The strangler-fig migration pattern

*Sequence:* 1 +
*Item type:* lesson +
*Style:* lecture_discussion +
*Delivery pattern:* shared +
*Duration:* 15 min

=== Facilitation notes

Open with the coexistence problem directly: the legacy system and the new microservices must
answer requests side by side during the whole migration window, not just at cutover. `[stated]`
Ask the group, before showing any diagram, whether they have lived through a big-bang cutover
and how it went — this primes the lecture_discussion stop the CURRICULUM style calls for.
`[inferred]`

=== Key points to land

* The pattern's name comes from the legacy system being progressively "strangled" as traffic
  moves away from it, not replaced in one step. `[stated]`
* A router (the gateway, taught next) is what makes the coexistence possible. `[stated]`

=== Common misconceptions to watch for

Learners sometimes assume the legacy system is deleted as soon as one microservice replaces a
piece of it. Correct this before moving to PRQ-SCG-BASICS: the legacy system keeps serving every
path not yet migrated until the migration is complete. `[inferred]`

=== Timing guidance

Budgeted 15 min per CURRICULUM. If the discussion stop runs long, cut the second discussion
prompt rather than the definition — the definition is required for every later item in this
session. `[inferred]`

=== Related material

* Support material listed in CURRICULUM: reading (short reference article on the strangler-fig
  pattern), diagram (legacy + gateway + migrated services coexisting).
* Student book section: `material/student/books/session-01-student-book.adoc`, section
  `PRQ-STRANGLER-FIG-PATTERN`.
```

A `hands_on_practical` item's section adds a pointer instead of restating setup steps:

```asciidoc
=== Related material

* Hands-on setup guide (teacher): `material/teacher/hands-on/session-01-PRQ-CONTAINERIZE-GATEWAY-setup-guide.adoc`
* Hands-on solving guide (student): `material/student/hands-on/session-01-PRQ-CONTAINERIZE-GATEWAY-solving-guide.adoc`
```

A `checkpoint` or `assessment` item's section adds an answer/solution walkthrough plus pointers
to the rubric and quiz key, instead of duplicating either:

```asciidoc
[[DR-DEPLOY-GATEWAY]]
== DR-DEPLOY-GATEWAY — Checkpoint: gateway reachable on GKE

*Sequence:* 6 +
*Item type:* checkpoint +
*Duration:* 15 min

=== Facilitation notes

Run this live against the group's own deployed gateway, not a recording — the rubric requires an
actual HTTP response, and a canned example would not tell the teacher whether this specific
cohort's deployment works. `[inferred]`

=== Solution walkthrough

A passing run: `kubectl get pods` shows the gateway pod `Running`/`Ready`; the exposing
Service/Ingress resolves; a request from outside the cluster returns any HTTP status, including a
default 404 for an unrouted path, as long as it came from the gateway and not a timeout. `[stated,
from CURRICULUM rubric]`

=== Common misconceptions to watch for

A learner may treat a connection timeout as "the gateway works, the path is just wrong" — it is
the opposite: a timeout means the gateway was never reached. Only an HTTP response, of any status,
counts. `[inferred]`

=== Related material

* Rubric (student-facing, teacher reads the same file):
  `material/student/rubrics/session-01-DR-DEPLOY-GATEWAY-rubric.md`
* This item has no quiz — CURRICULUM's own rubric is the check for this checkpoint kind.
```

When a checkpoint or assessment item also has an `assessment`-kind quiz (per
`.claude/reference/material_catalog.md`), point to the quiz key instead of writing the questions
into the teacher book:

```asciidoc
=== Related material

* Quiz answer key (teacher): `material/teacher/quizzes/session-01-DR-STRANGLER-ROUTING-quiz-assessment-key.md`
* Rubric (student-facing, teacher reads the same file):
  `material/student/rubrics/session-01-DR-STRANGLER-ROUTING-rubric.md`
```

For a capstone (no `node_ref`, `covers_node_refs` instead), head the section `capstone` and list
every covered node in the pointer section:

```asciidoc
[[capstone]]
== capstone — End-to-end strangler-fig gateway capstone

*Sequence:* 27 +
*Item type:* assessment +
*Assessment kind:* capstone +
*Duration:* 20 min

=== Related material

* Rubric (student-facing, teacher reads the same file):
  `material/student/rubrics/session-02-capstone-rubric.md`
* Covers: DR-DEPLOY-GATEWAY, DR-STRANGLER-ROUTING, DR-VALIDATE-AUTH, DR-TRACING, DR-MINT-TOKEN.
```

## What counts as teacher-only content

The teacher book is the one file type allowed to hold, for every item in the session:

- Facilitation notes: how to run the item, in what order, with which live prompt or question.
- Answer or solution walkthroughs for checkpoints and assessments — the passing outcome and why,
  derived from the item's `rubric`.
- Timing guidance beyond the raw `duration_minutes` figure — what to cut if the item runs long,
  what must not be cut.
- Common misconceptions to watch for, tied to the specific cohort in STUDENT_PERSONAS when a
  persona's known gap makes one predictable.

It never contains the full text of another material type's file (a quiz's questions, a rubric's
criteria text, a hands-on guide's steps) — it points to that file's path under `Related
material` instead. This is what keeps the teacher book from drifting out of sync with files owned
by other subagents: one fact, one file, one writer, per `material_authoring_rules.md`.

## Deriving section content

- `Facilitation notes`, `Key points to land`, and `Common misconceptions to watch for` trace to
  the item's `node_ref` `description` in DESIGN, and to the item's own CURRICULUM fields
  (`notes`, `lane_tasks`, `delivery_pattern`). Tag anything beyond a direct restatement per
  `material_authoring_rules.md`.
- `Solution walkthrough` (checkpoint/assessment items only) traces to the item's `rubric` text —
  restate what a pass looks like and why, do not add a pass condition the rubric does not state.
- `Timing guidance` traces to `duration_minutes` and, when present, `embedded_in`. If an item's
  budget looks tight against its content, say so and tag `[risk]` rather than silently padding or
  cutting content to fit.
- `Related material` paths are computed from `.claude/reference/material_catalog.md`'s filename
  pattern for the item's `style`/`item_type`, using the session number and `node_ref` (or
  `capstone`) — never invented, never guessed from memory of a previous session.

## Status and the approval gate

`status: draft` until a human reviews the file. Only a human sets `status: approved` —
`teacher-book-author` never sets it itself. Because the file is one document covering a
whole session, approve it as a whole; a partial approval (some sections signed off, others still
draft) is not supported by the single `:status:` attribute — reopen the whole file to `draft` if
any section needs another pass.
