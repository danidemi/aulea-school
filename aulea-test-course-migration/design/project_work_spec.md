# Project work spec

Covers one lesson item with `style: project_based`, as two outputs written together by
`project-work-author`. Read `design/material_authoring_rules.md` first; this file
covers what is specific to project work.

- Student brief: `material/student/project-work/session-NN-<node_ref>-project-work.adoc` —
  the open-ended scenario, what it draws on, constraints, deliverable expectations, and a
  pointer to the rubric. No solutions, no teacher-only content.
- Teacher facilitation notes: `material/teacher/project-work/session-NN-<node_ref>-facilitation-notes.adoc` —
  how to set the activity up, how to support without over-directing, likely solution paths and
  how to judge them, common sticking points, and timing guidance.

Both files describe the same activity from two angles. They must stay consistent: the same
scenario, the same constraints, the same expected deliverable. A change to one during review
means re-checking the other.

Per `material_catalog.md`, a capstone/final assessment item may omit `node_ref` and carry
`covers_node_refs` instead — for that case, use `capstone` in place of `<node_ref>` in both
filenames.

## `project_based` versus `hands_on_practical`: what changes in the writing

A `style: hands_on_practical` item (covered by `design/hands_on_guide_spec.md`) is a scripted
exercise tied to one node, with one clear expected outcome — the setup guide can name exact
steps and the solving guide can walk them in order.

A `style: project_based` item is different in three ways that change how you write both files:

- **It integrates multiple already-taught nodes**, not one. The CURRICULUM item's own `node_ref`
  names the node the item is anchored to, but the activity draws on everything the cohort
  already holds. If the CURRICULUM item also carries `covers_node_refs`, read that list as the
  full set of integrated nodes. If the item has neither `covers_node_refs` nor an obvious single
  anchor, name the integrated nodes in prose in the "skills this draws on" section, and add an
  `instructional_decisions` entry recording which nodes you judged relevant and why, tagged
  `inferred`.
- **It is less scripted.** Do not write a numbered procedure the learner is meant to follow
  step by step — that is what a `hands_on_practical` solving guide does. Describe the goal and
  the constraints, and leave the path to it open.
- **It may have more than one valid solution path.** The brief must not imply there is exactly
  one correct sequence of actions. The facilitation notes must anticipate at least two plausible
  paths a group could take and say how to judge each fairly against the same rubric — a rubric
  written for one assumed path unfairly penalizes a group that reached the same result a
  different way.

## Worked example

`design/curriculum.json` has no plain `item_type: lesson` item with `style: project_based` yet.
The closest real match is session 2's final item, sequence `27`: `item_type: assessment`,
`assessment_kind: capstone`, no `style` field at all, `covers_node_refs` naming all five
DesiredResults, a five-criterion rubric, and `lane_tasks` where both personas jointly narrate and
verify their part of one running system. That shape — integrating several already-taught nodes,
no single scripted path, judged against one shared rubric — is exactly what `project_based`
describes, even though the schema does not require (or forbid) a `style` value on an assessment
item. This spec uses that real item as the worked example, and records the routing judgement
below as an `instructional_decisions` entry rather than inventing a fictional item to sidestep
the gap.

```json
{
  "sequence": "27",
  "item_type": "assessment",
  "title": "End-to-end strangler-fig gateway capstone",
  "delivery_pattern": "shared",
  "duration_minutes": 20,
  "assessment_kind": "capstone",
  "covers_node_refs": ["DR-DEPLOY-GATEWAY", "DR-STRANGLER-ROUTING", "DR-VALIDATE-AUTH", "DR-TRACING", "DR-MINT-TOKEN"],
  "rubric": "Pass if, in one integrated run against the live GKE-deployed gateway: (1) the gateway is reachable, (2) /legacy/** and migrated paths split correctly, (3) a valid Entra JWT is accepted (an invalid one rejected) and CORS allows the approved origin, (4) a trace connects the gateway to a downstream/legacy call across the request, and (5) a downstream/legacy call carries a correctly-shaped minted token. Both participants jointly narrate and verify their part of the running system.",
  "lane_tasks": [
    { "persona": "P-DEV", "task": "Narrate and verify the code-side behavior: routing rules, JWT validation, filters, minted token, instrumentation.", "role": "contributor" },
    { "persona": "P-OPS", "task": "Narrate and verify the operational side: deployment health, traffic split, CORS, collector pipeline, configuration.", "role": "contributor" }
  ],
  "support_material": [
    { "kind": "rubric", "description": "Capstone pass/fail checklist covering all five DesiredResults, handed to participants before the run." }
  ]
}
```

Because it has no `node_ref`, both files use `capstone` in place of `<node_ref>` in their
filenames, per `material_catalog.md`.

### Student brief

`material/student/project-work/session-02-capstone-project-work.adoc`:

```asciidoc
= End-to-end strangler-fig gateway capstone
:status: draft
:covers_node_refs: DR-DEPLOY-GATEWAY, DR-STRANGLER-ROUTING, DR-VALIDATE-AUTH, DR-TRACING, DR-MINT-TOKEN
:session: 2
:sequence: 27
:duration_minutes: 20
:rubric_path: material/student/rubrics/session-02-capstone-rubric.md

[instructional_decisions]
====
* Decision: "Treated this item as project_based in shape and routed it to
  project-work-author, even though CURRICULUM leaves its `style` field absent (only
  `assessment_kind: capstone` is set)." Rationale: "It integrates five already-taught
  DesiredResults with no single scripted path and is judged jointly against one rubric — the
  same traits `style: project_based` names elsewhere in the schema." Confidence: inferred.
  Awaiting: instructional-designer.
====

== Scenario

Over this session you and your partner have deployed the strangler-fig gateway, split traffic
between legacy and migrated paths, secured it with Entra JWT validation and CORS, instrumented
it for distributed tracing, and minted a legacy-shaped token for downstream calls [stated] —
each as a separate exercise. This capstone asks for one integrated demonstration that all five
capabilities work together, on the same live request path.

== Goal

In one run against the live GKE-deployed gateway, jointly narrate and verify all five
DesiredResults on the same request path: the gateway is reachable, `/legacy/**` and migrated
paths split correctly, a valid Entra JWT is accepted (and an invalid one rejected) with CORS
allowing the approved origin, a trace connects the gateway to a downstream/legacy call, and that
downstream call carries a correctly-shaped minted token [stated]. How you organize the run is
your choice, as long as all five are shown together, not in isolation.

== Skills this draws on

This activity integrates five already-taught DesiredResults [stated]: gateway deployment and
reachability (`DR-DEPLOY-GATEWAY`), legacy-vs-migrated routing (`DR-STRANGLER-ROUTING`), JWT
validation and CORS (`DR-VALIDATE-AUTH`), end-to-end tracing (`DR-TRACING`), and legacy-shaped
token minting (`DR-MINT-TOKEN`). Unlike a single-node hands-on exercise, no one of these is the
point on its own — the point is that they hold together on one request.

== Constraints

* Use the gateway deployment and configuration you already have from earlier exercises this
  session — do not start from a fresh deployment.
* The demonstration must use the live GKE-deployed gateway, not a local mock [stated].
* Both partners (`P-DEV`, `P-OPS`) must jointly narrate and verify their part of the running
  system [stated] — a demonstration only one partner can explain does not meet the goal.

== Deliverable expectations

By the end of the capstone, be ready to show, in one integrated run: the gateway reachable, the
correct legacy/migrated path split, a valid JWT accepted (an invalid one rejected) with CORS
allowing the approved origin, a trace connecting the gateway to a downstream/legacy call, and
that call carrying a correctly-shaped minted token [stated]. There is more than one valid way to
organize the run, as long as all five criteria are demonstrated together.

== How this will be assessed

Scored against the rubric at `material/student/rubrics/session-02-capstone-rubric.md`. Read it
before you start — it is the same rubric your facilitator uses.
```

### Teacher facilitation notes

`material/teacher/project-work/session-02-capstone-facilitation-notes.adoc`:

```asciidoc
= Facilitation notes: end-to-end strangler-fig gateway capstone
:status: draft
:covers_node_refs: DR-DEPLOY-GATEWAY, DR-STRANGLER-ROUTING, DR-VALIDATE-AUTH, DR-TRACING, DR-MINT-TOKEN
:session: 2
:sequence: 27
:duration_minutes: 20
:paired_brief_path: material/student/project-work/session-02-capstone-project-work.adoc

[instructional_decisions]
====
* Decision: "Flagged 20 minutes as tight for five criteria narrated jointly by two partners, and
  recommended pairs rehearse their narration order before the graded run rather than working it
  out live." Rationale: "`duration_minutes: 20` [stated] leaves little room to recover from a
  fumbled narration once the run starts; a short rehearsal reduces avoidable time loss without
  changing what is graded." Confidence: inferred. Awaiting: instructional-designer.
====

== Introducing and setting up

Open by naming the five DesiredResults the run must demonstrate together and the single ask:
one integrated run, not five separate re-demonstrations. Read the brief's Scenario and Goal
aloud, or have pairs read them, then release pairs to prepare. Do not demonstrate a specific run
order yourself — showing one narrows every pair toward it and undercuts the point of judging
pairs on their own organization of the run.

Confirm before releasing pairs: both partners have the gateway deployment from earlier in the
session in working order, and both know where the rubric lives (same path named in the brief).

== Circulating and supporting without over-directing

Do not guide a pair toward one specific sequence of steps or run order. When a pair asks
"should we check auth or routing first?", answer with a question about what they are trying to
confirm, not with an ordering. Intervene directly only when a pair is blocked by something
outside the scope of the capstone itself (e.g. a broken deployment carried over from an earlier
exercise), not when they are simply choosing a different valid run order than another pair.

== Likely divergent solution paths and how to judge them

At least two run organizations are plausible [inferred]:

* **One continuous run.** The pair sends a single request through the full gateway and narrates
  all five criteria as they are satisfied by that one request, in whatever order the request
  naturally exercises them.
* **A short sequence of separate checks.** The pair verifies each of the five criteria with its
  own small check (a routing test, an auth test, a trace lookup, a token inspection), then
  argues the five checks together satisfy the rubric.

Judge both against the same five rubric criteria, not against a preferred organization. A pair
choosing the second path still passes if all five criteria are shown, even without one single
continuous request. Do not penalize a pair for organizing the run differently than another pair,
only for missing a criterion.

== Common places groups get stuck

* **Narration handoff** — with both partners required to narrate jointly [stated], pairs that
  have not agreed in advance who speaks to which criterion lose time mid-run. If a pair stalls
  here, it is fair to let them pause and agree a speaking order before continuing, since this is
  a coordination gap, not a technical one.
* **Stale deployment state** — a pair's gateway does not reflect the configuration expected at
  this point in the session. Direct them to fix the underlying deployment rather than working
  around it inside the graded run.
* **Trace-to-token handoff** — criteria 4 and 5 both depend on the same downstream call; a pair
  that treats them as two unrelated checks may re-issue two different requests instead of
  reading both off one. Point them back to the Goal section's "on the same request path"
  language if this happens.

== Timing guidance

Budgeted `duration_minutes: 20` [stated] for the graded run itself. Given the coordination
demand of a jointly-narrated, five-criterion run, allow pairs to rehearse their narration order
briefly using their own existing deployment before the graded run starts, rather than treating
all 20 minutes as graded time — see the `instructional_decisions` entry above. Do not let
rehearsal expand into a second full run; one graded run per pair.
```

## Deriving the brief and the notes

- The scenario and goal in the brief must trace to the CURRICULUM item's `title` and the
  DesiredResult(s) it integrates (its `node_ref`, or `covers_node_refs` for a capstone-shaped
  item) — read each named node's `description` in DESIGN for what it actually established.
- Constraints come from what LOGISTICS and the item's own fields state (environment, time,
  `delivery_pattern`/`lane_tasks` if the item splits by persona). Do not invent a constraint no
  store supports.
- **Ordinary case — a plain `item_type: lesson` item with `style: project_based`.** Per
  `material_catalog.md`, the rubric-author trigger is a non-empty `rubric` field on a
  `checkpoint` or `assessment` item; a plain lesson item normally has neither, so no rubric file
  exists to point to. This is the default, not an exception: write a short paragraph in the
  brief's "how this will be assessed" section describing the expected demonstration in general
  terms, tag it `[invented framing]`, and add an `instructional_decisions` entry noting that no
  rubric exists yet for this item, `awaiting: instructional-designer`. Likewise, such an item
  will usually carry a single `node_ref` and no `covers_node_refs` — name the other integrated
  nodes in prose (see the `project_based` versus `hands_on_practical` section above), rather
  than expecting the field to be present.
- **Capstone-shaped case** — an `item_type: assessment` item with `assessment_kind: capstone`
  (or any item that otherwise reads as `project_based` in shape without an explicit `style`
  value; record that routing judgement as an `instructional_decisions` entry, as in the worked
  example). These items do carry a non-empty `rubric` and, typically, `covers_node_refs`. This
  is where the rubric pointer resolves: point both files at
  `material/student/rubrics/session-NN-capstone-rubric.md` and do not restate the rubric's
  criteria beyond what is needed to name it.
- The facilitation notes' divergent-solution-paths section must name at least two paths whenever
  the underlying activity plausibly supports more than one — if you can only construct one
  path, say so and tag it `[risk]` rather than padding with a second path that is not genuinely
  distinct.
- Timing guidance in the notes must sum to the item's `duration_minutes` — do not propose a
  split that exceeds or falls short of the budgeted time without flagging the mismatch as an
  `instructional_decisions` entry.

## Status and the approval gate

`:status: draft` on both files until a human reviews them. Only a human sets `:status: approved` —
`project-work-author` never sets it itself. Approve the brief and the facilitation notes
together; they must never drift out of sync (same scenario, same constraints, same deliverable).
