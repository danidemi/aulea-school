---
status: draft
node_ref: PRQ-STRANGLER-FIG-PATTERN
session: 1
sequence: "1"
title: "Reading guide: the strangler-fig migration pattern"
support_material_description: "Short reference article/summary on the strangler-fig pattern for legacy migrations."
uri: null
instructional_decisions:
  - decision: "specifications/editorial_guidelines.md does not exist yet. This guide follows the fallback tone rule in design/material_authoring_rules.md instead: plain language, no idioms or metaphors, direct terms, from CLAUDE.md's 'Editing rules for agents and skills'."
    rationale: "material_authoring_rules.md requires recording this fallback so the file is revisited once EDITORIAL_GUIDELINES exists."
    confidence: stated
    awaiting: instructional-designer
  - decision: "No uri was supplied for this reading in CURRICULUM. This guide uses the honest-gap placeholder from design/reading_guide_spec.md instead of inventing a link, title, or publisher."
    rationale: "material_authoring_rules.md and reading_guide_spec.md both require flagging a missing asset rather than filling the gap with invented content."
    confidence: stated
    awaiting: instructional-designer
---

## The reading

Short reference article/summary on the strangler-fig pattern for legacy migrations.

**Placeholder — no asset supplied yet.** CURRICULUM names this reading by its `description`
above but carries no `uri`. This guide's "why it matters" and guiding questions are written
against that description; re-check them once the actual asset is linked, in case the real
reading covers the ground differently than expected.

## Why this reading matters

This item covers the strangler-fig migration pattern: incrementally routing traffic to new
microservices while the legacy system keeps serving the rest, so both environments coexist
during the migration window [stated, from PRQ-STRANGLER-FIG-PATTERN]. This node is a root node
in the course's knowledge graph — it does not depend on any earlier concept, and it opens the
whole course as the motivating framing for everything that follows [stated, from
PRQ-STRANGLER-FIG-PATTERN and its `root_rationale`]. Read this before the lecture starts, since
the session builds path-based routing directly on top of the reasoning this pattern gives you
[inferred, from the DESIGN edge connecting PRQ-PATH-BASED-ROUTING to PRQ-STRANGLER-FIG-PATTERN:
splitting traffic by path is only motivated once this pattern is understood].

## Before you start

- Read time: roughly 10 minutes [inferred].
- No prior reading is assumed for this item — it is the first item of the first session and the
  first node the course teaches.

## While you read, look for

- Notice how the article describes the legacy system and the new microservices running side by
  side, rather than one replacing the other overnight — this coexistence during the migration
  window is the core idea the pattern names.
- Look for what has to keep working for both environments while the migration is in progress.
- Notice any mention of splitting traffic gradually, piece by piece, rather than switching over
  in one step — this is the reasoning the rest of the session will turn into a concrete routing
  mechanism.
- Compare the article's framing of "incremental migration" against how you would explain, in
  one sentence, why splitting traffic gradually is what makes the rest of this session's
  path-based routing work worth doing [invented framing, connecting to the DESIGN edge: routing
  by path is only motivated once this pattern is understood].
