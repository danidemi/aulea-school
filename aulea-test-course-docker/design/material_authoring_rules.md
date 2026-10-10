# Material authoring rules

Cross-cutting rules shared by every phase-4 authoring subagent (teacher book, student book,
quiz, demo script, hands-on guide, project work, rubric, reading guide). Each subagent's own
spec (`design/*_spec.md`) covers what is specific to its output; this file covers what is the
same for all of them. Read this file and your own spec before writing anything.

## Retrieval before generation

Derive content only from:

- CURRICULUM (`design/curriculum.json`) — the item(s) you were asked to cover.
- DESIGN (`design/knowledge_goals_graph.json`) — the node(s) the item teaches or checks, for
  the underlying concept, its prerequisites, and its `provenance_tags`.
- EDITORIAL_GUIDELINES (`specifications/editorial_guidelines.md`) — tone, terminology,
  idiom/metaphor policy, visual template pointers, accessibility notes.
- Your own shape spec and this file.

Never invent course content from general knowledge and never rely on memory of an earlier
version of a store — read the current file every time. If a fact you need is not in any of the
stores above (an example value, a screenshot, a tool's exact command-line output), say so
explicitly in the file rather than filling the gap — use a `placeholder`-style note (see
"Honest gaps" below), the same principle the slide pipeline applies to images it cannot fetch.

## Missing EDITORIAL_GUIDELINES

`specifications/editorial_guidelines.md` is written only by the `requirements-gatherer`
skill, interactively, and may not exist yet when you run. If it is missing:

1. Do not invent its content and do not wait for it to appear.
2. Fall back to this repository's own editing rules (`CLAUDE.md`, "Editing rules for agents and
   skills"): avoid idioms and metaphors, use literal and direct terms, prefer plain language,
   prioritize clarity over rhetoric.
3. Record an `instructional_decisions` entry (see below) noting that EDITORIAL_GUIDELINES was
   absent and this fallback was used, tagged `awaiting: instructional-designer`, so the file is
   revisited once EDITORIAL_GUIDELINES exists.

## Never invent, always cite

Every file you write opens with the `node_ref`(s) it covers (or `covers_node_refs` for a
capstone), naming the CURRICULUM item's `sequence` key and session number. A human or another
agent must be able to trace any paragraph in the file back to a specific graph node or
curriculum item.

## Confidence and provenance tagging

Anything you had to frame, phrase, or fill in beyond a direct restatement of a store fact — an
example scenario, a suggested wording, an inferred difficulty level — carries the same
confidence/provenance tags DESIGN and STUDENT_PERSONAS already use: `[stated]`, `[inferred]`,
`[invented framing]`, `[risk]`. Tag inline, next to the content it applies to, not only in a
footer. A reader must be able to tell, sentence by sentence, what came from a store and what you
added.

## Honest gaps

When a store does not give you what you need to write something concrete (a real screenshot, a
client-specific value, an exact tool version), write a clearly marked placeholder — what is
needed and why it could not be produced — rather than inventing a plausible-looking substitute.
This mirrors the slide model's `placeholder` body kind.

## Status convention

Every file carries a status marker standing in for the slide pipeline's render gate — there is
no separate render step for these formats, so the marker itself is the gate:

- AsciiDoc files: a `:status:` document attribute, `draft` or `approved`, set at the top of the
  file (e.g. `:status: draft`).
- Markdown files: a YAML frontmatter block with a `status:` key, `draft` or `approved`.

A subagent writes `status: draft` only. **Only a human sets `status: approved`** — the same rule
the slide pipeline enforces: a model that can flip its own approval flag has no gate at all.

## The `instructional_decisions` handover list

Phase 3 (instructional design) has no owner yet. Writing this material is impossible without
making some of those decisions — how much to script a hands-on exercise, whether a lesson needs
a formative check, how strict a rubric threshold should read. Make the call, but record it
instead of burying it in prose: every file that makes such a call carries an
`instructional_decisions` list (same shape as the slide model's), each entry with `decision`,
`rationale`, `confidence` (`stated`/`inferred`/`invented`), and `awaiting:
instructional-designer`. This list is the handover once a phase-3 owner exists.

- AsciiDoc files: a fenced `instructional_decisions` block near the top (after the title, before
  the first section), one bullet per entry.
- Markdown files: an `instructional_decisions:` list in the YAML frontmatter, same field names as
  the slide model uses.

## Ownership boundaries

- Write only the file(s) your own catalog row names. Never touch another subagent's output file,
  even to fix something you noticed — report it instead.
- Never write to `design/curriculum.json` or any other SSOT store. A material's existence is
  discovered by the orchestrating skill matching `.claude/reference/material_catalog.md`'s
  filename pattern, not by any subagent filling in `support_material[].uri`.
- If the CURRICULUM or DESIGN item you were asked to cover does not exist, or a required store
  is entirely missing, stop and report the gap to the orchestrating skill rather than
  improvising content for it.
