# Reading guide spec

Covers the reading guide, the one-page orientation a student gets before doing an assigned
reading. Read `design/material_authoring_rules.md` first; this file covers what is specific to
reading guides.

One file per lesson item whose `support_material` array contains an entry with `kind: reading`,
written by `reading-guide-author`:

- Student handout: `material/student/reading-guides/session-NN-<node_ref>-reading-guide.md`.

There is no teacher counterpart. A reading guide orients the student toward material that
already exists (or is planned) outside the course's own authored content — it does not test
comprehension, so it carries no answer key.

## What a reading guide is not

A reading guide is not a quiz. Its guiding questions send the student into the reading with a
purpose, the same way a lecturer might say "as you read this, notice how the author handles X"
before assigning a chapter. They:

- Have no single correct answer recorded anywhere in the file.
- Are phrased to point attention ("Notice how…", "Look for…", "Compare…"), not to test recall
  ("What is…", "Name the…").
- Are never followed by an answer, a rationale, or a scoring note.

If a question can be answered correctly or incorrectly and that answer matters for the file, it
belongs in a quiz (`design/quiz_spec.md`), not here.

## Frontmatter

```yaml
---
status: draft                          # draft | approved — only a human sets approved
node_ref: PRQ-STRANGLER-FIG-PATTERN
session: 1
sequence: "1"                          # the CURRICULUM item's sequence key
title: "Reading guide: the strangler-fig migration pattern"
support_material_description: "Short reference article/summary on the strangler-fig pattern for legacy migrations."
uri: null                              # the support_material entry's uri, or null if not yet supplied
instructional_decisions:               # omit the key entirely when there is nothing to record
  - decision: "…"
    rationale: "…"
    confidence: stated | inferred | invented
    awaiting: instructional-designer
---
```

`support_material_description` is copied verbatim from the CURRICULUM item's `support_material`
entry — do not paraphrase it, so a reader can match the guide back to the exact entry it covers.

## Body

Four sections, in this order:

```markdown
## The reading

Short reference article/summary on the strangler-fig pattern for legacy migrations.

Link: https://example.com/strangler-fig-pattern [stated]

## Why this reading matters

This reading covers the strangler-fig pattern: incrementally routing traffic to new
microservices while the legacy system keeps serving the rest, so both environments coexist
during the migration window [stated, from PRQ-STRANGLER-FIG-PATTERN]. The rest of this session
builds on this framing, so read it before the lecture on routing rules.

## Before you start

- Read time: roughly 10 minutes [inferred].
- No prior reading is assumed for this item.

## While you read, look for

- Notice how the article describes the two systems running side by side — what has to stay
  working during the migration window.
- Compare the article's description of "incremental routing" against how you would explain
  it in one sentence to a colleague.
- Look for any risk or failure case the article mentions if the routing rule is wrong.
```

- **The reading**: restate the `support_material` entry's `description` field verbatim, then
  either the `uri` if the entry has one, or the honest-gap placeholder below if it does not.
- **Why this reading matters**: one short paragraph, tying the reading to the DESIGN node's
  `description` — state plainly why this specific node needs this specific reading, tagged
  `[stated]` when quoting the node description directly, `[inferred]` or `[invented framing]`
  for any framing you add to connect it to the session.
- **Before you start**: any short practical note — estimated read time, whether prior reading is
  assumed. Tag an estimate you compute yourself (e.g. a read-time guess) `[inferred]`.
- **While you read, look for**: two to five guiding questions or prompts, phrased as
  orientation, not as a test. Derive each one from the node's `description` and its
  `provenance_tags`/prerequisites in DESIGN — a prompt should point at something the reading is
  expected to cover because the node needs it, not at trivia the reading happens to contain.

## Honest gap: missing `uri`

If the `support_material` entry has no `uri` (the asset has not been supplied yet), do not
invent a link, a title, or a publisher. Write instead:

```markdown
## The reading

Short reference article/summary on the strangler-fig pattern for legacy migrations.

**Placeholder — no asset supplied yet.** CURRICULUM names this reading by its `description`
above but carries no `uri`. This guide's "why it matters" and guiding questions are written
against that description; re-check them once the actual asset is linked, in case the real
reading covers the ground differently than expected.
```

Set `uri: null` in the frontmatter in this case and add an `instructional_decisions` entry
noting the gap, `awaiting: instructional-designer` — the same person who owns closing this kind
of gap once support_material assets are sourced.

## Status and the approval gate

`status: draft` until a human reviews the file. Only a human sets `status: approved` —
`reading-guide-author` never sets it itself.
