# Quiz spec

Covers all three quiz kinds — `prereq-check`, `engagement`, `assessment` — with one spec, since
the mechanics (question, answer, key) are shared; a `kind` field distinguishes them. Read
`design/material_authoring_rules.md` first; this file covers what is specific to quizzes.

Two files per quiz, written together by `quiz-author`:

- Student paper: `material/student/quizzes/session-NN-<node_ref>-quiz-<kind>.md` — questions
  only, no answers.
- Teacher key: `material/teacher/quizzes/session-NN-<node_ref>-quiz-<kind>-key.md` — the same
  questions plus the correct answer and a short rationale for each.

## Quiz kinds

- `prereq-check`: given before a lesson, checks whether the cohort already holds a prerequisite
  node. No automatic CURRICULUM trigger — used only when the orchestrating skill or a human asks
  for one ahead of a specific item.
- `engagement`: a short formative check inside or right after a lesson, to keep attention and
  surface misconceptions early. Also human-selected, not automatically triggered.
- `assessment`: checks whether the cohort achieved a `DesiredResult`, tied to a CURRICULUM item
  with `item_type: checkpoint` or `item_type: assessment`. This is the only kind with an
  automatic trigger (see `.claude/reference/material_catalog.md`).

## Student paper frontmatter

```yaml
---
status: draft                    # draft | approved — only a human sets approved
kind: assessment                 # prereq-check | engagement | assessment
node_ref: DR-STRANGLER-ROUTING   # or covers_node_refs for a capstone
session: 1
sequence: "10"                   # the CURRICULUM item's sequence key
title: "Checkpoint: legacy-vs-new traffic split"
time_minutes: 10                 # how long the quiz itself should take, not the lesson's budget
instructional_decisions:         # omit the key entirely when there is nothing to record
  - decision: "…"
    rationale: "…"
    confidence: stated | inferred | invented
    awaiting: instructional-designer
---
```

## Student paper body

One question per numbered item. Every question states its type explicitly so a learner and a
grader read the same expectation:

```markdown
## Q1 (multiple choice)

A request to `/legacy/orders` arrives at the gateway. Which route handles it?

A. The route matching `/legacy/**`
B. The route matching the migrated `orders` service
C. Neither — the gateway returns 404
D. Both, load-balanced

## Q2 (short answer)

State the one HTTP header a client needs for a cross-origin call to succeed, if CORS at the
gateway is misconfigured for its origin.

## Q3 (practical)

Run the smoke-test script against your deployed gateway. Paste the response status code you got.
```

Allowed question types: `multiple choice`, `short answer`, `practical` (requires the learner to
run something and report a result — only for a hands-on-adjacent checkpoint), `true/false`.
Do not invent a new type without recording it as an `instructional_decisions` entry.

## Teacher key body

Mirrors the student paper question-by-question, adding the answer and a one- or two-sentence
rationale tied back to the node:

```markdown
## Q1 (multiple choice)

**Answer: A.** `/legacy/**` is the path-based predicate configured to send legacy traffic to the
legacy system; see `PRQ-PATH-BASED-ROUTING`.

## Q2 (short answer)

**Answer:** `Access-Control-Allow-Origin` (naming the specific allowed origin, or `*` only when
appropriate). Accept an answer that names the header even if the learner does not name the exact
allowed-origin value.

## Q3 (practical)

**Expected:** `200` (or the status the gateway's default/unrouted-path response returns, per the
item's rubric). Accept any answer consistent with the item's checkpoint rubric in CURRICULUM.
```

## Deriving questions

- An `assessment`-kind quiz's questions must trace to the CURRICULUM item's own `rubric` text —
  every pass/fail criterion in the rubric should be checkable by at least one question. Do not
  add questions that test something the rubric does not cover; that is scope creep past what
  DESIGN/CURRICULUM asked to be checked.
- A `prereq-check` or `engagement` quiz's questions trace to the target node's `description` in
  DESIGN.
- If a rubric criterion cannot be turned into a fair question without inventing a scenario not
  in any store, write it anyway but tag it `[invented framing]` inline and add an
  `instructional_decisions` entry explaining the gap.

## Status and the approval gate

`status: draft` on both files until a human reviews them. Only a human sets `status: approved` —
`quiz-author` never sets it itself. Approve the student paper and the teacher key
together; they must never drift out of sync (same questions, same order, same `kind`).
