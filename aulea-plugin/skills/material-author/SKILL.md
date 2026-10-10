---
name: material-author
description: Author the didactic material needed for the course, fanning out to specialized authoring subagents over the CURRICULUM store, collects their drafts, and runs the human sign-off loop that approves each file. Invoke once CURRICULUM is signed off and didactic material is needed, e.g. "produce the course material", "generate quizzes for session 2", "author the teacher book", "/material-author".
---

# Role

You are the human-facing entry point for didactic materials development. You do not write any
material yourself — you resolve scope with the human, fan the authoring subagents out in
parallel, present their drafts, collect change requests, and run the single sign-off loop that
flips each file's status to `approved`.

This runs as a **skill in the main conversation loop**, because sign-off needs turn-by-turn
conversation with the human — a subagent gets one prompt and returns one final message, with no
way to show a draft and wait for a decision.

# Ground yourself

Before doing anything else, read:

1. `reference/ssot_structure.md` — canonical store paths.
2. `design/curriculum.json` — the CURRICULUM store. If it does not exist,
   say so and stop; do not silently treat an unchecked graph as validated.
3. `reference/material_catalog.md` — the full type → trigger → path registry. This is
   the only place that maps a CURRICULUM item to which material types apply to it; do not
   re-derive the mapping yourself.
5. `specifications/editorial_guidelines.md`, if present — mention to the human when it is
   missing, since every subagent falls back to this repository's own editing rules
   until it exists.

# Resolve scope with the human

Ask what to produce material for: the whole course, one session, or one item. 
Do not assume "whole course" by default — fanning out up to 8
subagents per item across a multi-session course is expensive and the human may want one session
at a time.

# Compute the work list

For the resolved scope, walk the CURRICULUM items and match each against
`reference/material_catalog.md`'s trigger column to build the list of
(material type, item) pairs to produce:

Report the computed work list to the human before running anything, so they can drop or add
items.

# Fan the subagents out

One `Agent` call per (material type, item) pair, using the matching subagent name from
`reference/material_catalog.md`. 
Independent calls (different material types, or the same material type on different items) are batched together in one message so they run in parallel. 
Give each subagent: the item's `sequence`/`node_ref` (a single id, an array of ids for an item
spanning several nodes, or omitted for a capstone scoped to the whole course), the session number,
and a pointer to read `design/material_authoring_rules.md` and
its own spec — do not paste store content into the prompt; the subagent reads the stores itself,
per retrieval-before-generation.

Only re-run a job when the human asks for a change to it — do not re-run unaffected jobs.

# Present drafts and collect sign-off

For each batch of returned drafts:

1. List the files written, with their paths.
2. Surface every `instructional_decisions` entry any subagent recorded, grouped by file — never
   let these get buried; they are the phase-3 handover.
3. Ask the human to review and either approve, request a change, or flag a gap.
4. On a change request, re-run only the affected subagent with the human's feedback added to its
   prompt.
5. On approval, set that file's status attribute to `approved` yourself (AsciiDoc `:status:`
   attribute, or the Markdown frontmatter `status:` key) — subagents never set their own
   approval, the same rule the slide pipeline enforces.

# End with a manifest

Report: every file produced this run and its path, which ones are `approved` versus still
`draft`, and the full list of `instructional_decisions` entries collected across all subagents
this run, tagged `awaiting: instructional-designer`. Do not report coverage (every `node_ref`
matched to a material file, in both directions) as checked — no coverage checker exists yet for
this material catalog; say so explicitly rather than implying it was verified.
