# Rubric spec

Covers the rubric file and its optional teacher-only addendum. Read
`design/material_authoring_rules.md` first; this file covers what is specific to rubrics.

One file per CURRICULUM item with a non-empty `rubric` field (`item_type: checkpoint` or
`assessment`), written by `rubric-author`:

- Rubric (student-facing, teacher reads the same file):
  `material/student/rubrics/session-NN-<node_ref>-rubric.md`.
- Addendum (teacher-only, optional, only when needed — see "The addendum" below):
  `material/teacher/rubrics/session-NN-<node_ref>-rubric-addendum.md`.

## Why the rubric lives under `material/student/`, not `material/teacher/`

The rubric is the same file the student self-checks against and the teacher scores against. It
is deliberately not duplicated into `material/teacher/`. A file's tree membership is the
access-control signal for the whole phase-4 pipeline (`material_authoring_rules.md`): a tree
name states who is allowed to see the file. Putting the rubric under `material/student/` states
that students see exactly the criteria they are scored against, before the check happens — that
is the entire point of a shared rubric. Filing it under `material/teacher/` instead would hide it
from students and defeat that purpose, even though a teacher also needs it. So the placement
follows the audience the file is written for, not the list of people who happen to read it.

Do not "fix" this to match the addendum's tree, and do not move the addendum next to the rubric
to match the rubric's tree. The two files carry different content and therefore different
access-control signals — see the next section.

## The addendum

Most rubrics need nothing beyond the rubric itself: the CURRICULUM item's `rubric` text, turned
into a checklist, is enough for both the student to self-check and the teacher to score. Only
write an addendum when there is real teacher-only content that must not be visible to a
student before the check — for example:

- Partial-credit weighting the student should not see in advance (it would let them game which
  criteria to prioritize instead of meeting all of them).
- Grader-only notes on how to break a tie between "borderline pass" and "borderline fail" for a
  criterion the rubric text leaves some judgement to.
- A known failure mode graders should watch for that would prime students if disclosed
  beforehand.

Do not write an addendum that only repeats the rubric in different words, restates the pass/fail
criteria without adding scoring nuance, or exists just because the catalog allows one. An
addendum with no real teacher-only content is a file nobody should have written — skip it.

### Why the addendum is filed under `material/teacher/rubrics/`, not next to the rubric

The addendum's whole reason to exist is content a student must not see before the check. By the
plan's own access-control rule, "nothing with teacher-only content may sit under
`material/student/`" (`.claude/planning/didactic_material_plan.md`). The addendum fails that rule
the moment it sits in the same directory as the rubric it annotates, regardless of naming
(`-addendum` suffix or not) — a shared directory has one access level, and the rubric's is
student-visible. So the addendum goes to the teacher tree, at:

```
material/teacher/rubrics/session-NN-<node_ref>-rubric-addendum.md
```

not `material/student/rubrics/session-NN-<node_ref>-rubric-addendum.md`. The two files live in
different trees, under the same `<node_ref>`, so anyone reading either one can find the other by
node reference and session number alone. Do not "correct" this split later to make the addendum
sit next to the rubric it describes — that would put teacher-only content under `material/student/`,
which is the one thing the access-control rule forbids.

## Rubric frontmatter

```yaml
---
status: draft                          # draft | approved — only a human sets approved
node_ref: DR-DEPLOY-GATEWAY            # or covers_node_refs for a capstone
session: 1
sequence: "6"                          # the CURRICULUM item's sequence key
item_type: checkpoint                  # checkpoint | assessment, from CURRICULUM
title: "Checkpoint: gateway reachable on GKE"
addendum: false                        # true only when a teacher-only addendum exists for this item
instructional_decisions:               # omit the key entirely when there is nothing to record
  - decision: "…"
    rationale: "…"
    confidence: stated | inferred | invented
    awaiting: instructional-designer
---
```

## Rubric body

Expand the CURRICULUM item's `rubric` text into a numbered checklist. Each item is a single,
checkable pass/fail statement — a student reads it and can tell, without help, whether they met
it. Do not change what the rubric text asks for; only restructure it into checkable form. Where
the source text bundles more than one condition into one sentence, split it into one checklist
line per condition rather than leaving a compound line a student has to parse.

```markdown
# Checkpoint: gateway reachable on GKE

Covers `DR-DEPLOY-GATEWAY` (session 1, sequence 6).

## Pass/fail checklist

Check every line below. All lines must pass for the checkpoint to pass.

- [ ] The gateway pod is `Running` and `Ready` in GKE.
- [ ] A Service or Ingress exposes the gateway pod.
- [ ] A test HTTP request sent from outside the cluster reaches the gateway and gets a response.
      A default `404` from an unrouted path counts as a pass, as long as the gateway itself
      produced it — a network timeout or connection error does not count.

## How to self-check

Run a request against the gateway's external address from a machine outside the cluster (your
laptop, not a pod). Confirm you get an HTTP response — any status code — rather than a hung
connection or a network-level error.
```

For a capstone or multi-criterion assessment, group the checklist by the `DesiredResult` (or
sub-check) each line traces to, so a student can see which part of the rubric each line verifies:

```markdown
# Capstone assessment: integrated gateway run

Covers `covers_node_refs: [DR-DEPLOY-GATEWAY, DR-STRANGLER-ROUTING, DR-AUTH-CORS, DR-TRACING,
DR-TOKEN-EXCHANGE]` (session N, sequence M).

## Pass/fail checklist

All five groups must pass.

### 1. Gateway reachable (`DR-DEPLOY-GATEWAY`)

- [ ] The deployed gateway is reachable from outside the cluster.

### 2. Legacy/new traffic split (`DR-STRANGLER-ROUTING`)

- [ ] A request to `/legacy/**` is routed to the legacy system.
- [ ] A request to a migrated path is routed to the corresponding microservice.

### 3. Auth and CORS (`DR-AUTH-CORS`)

- [ ] A request with a valid Entra-issued JWT is accepted and routed.
- [ ] A request with an invalid, expired, or wrong-audience JWT is rejected.
- [ ] A browser-style cross-origin preflight and call from an allowed origin succeeds end-to-end.

### 4. Tracing (`DR-TRACING`)

- [ ] A single request through the gateway produces a connected trace spanning the gateway and
      at least one downstream service (or the legacy system), visible end-to-end in the
      collector's backend or UI.

### 5. Token exchange (`DR-TOKEN-EXCHANGE`)

- [ ] A request validated at the gateway with an Entra JWT results in a downstream/legacy-bound
      request carrying a newly minted token matching the legacy application's expected claim
      shape.

## How to self-check

Run one integrated pass through the live, deployed gateway. Both participants jointly narrate
and verify the part of the checklist covering their own lane.
```

## Addendum frontmatter and body

The addendum is a small file — a few lines of teacher-only nuance, not a second rubric. It
carries its own status and points back to the rubric it annotates:

```yaml
---
status: draft
node_ref: DR-DEPLOY-GATEWAY
session: 1
sequence: "6"
rubric_path: material/student/rubrics/session-01-DR-DEPLOY-GATEWAY-rubric.md
title: "Addendum: gateway reachable on GKE"
instructional_decisions:
  - decision: "…"
    rationale: "…"
    confidence: stated | inferred | invented
    awaiting: instructional-designer
---
```

```markdown
# Addendum: gateway reachable on GKE

Teacher-only notes for `material/student/rubrics/session-01-DR-DEPLOY-GATEWAY-rubric.md`. Do not
share this file or its content with participants before the checkpoint runs.

## Scoring nuance

- Weight the "responds to a request" line at 60% of the checkpoint score, and the "Service/Ingress
  exposes the pod" line at 40% — a pod that is `Running`/`Ready` but unreachable from outside the
  cluster is a more common and more instructive failure than the reverse, so it should not
  automatically fail the whole checkpoint. [inferred]

## Tie-breaking

- If the gateway responds only over the cluster-internal address and not from outside, treat this
  as a fail on the exposure line even if the pod itself is healthy — "reachable" in the rubric
  means reachable by an external client, per the CURRICULUM item's rubric text.
```

## Deriving the checklist

- Every checklist line must trace to a clause in the CURRICULUM item's `rubric` text. Do not add a
  line that checks something the rubric text does not ask for — that is scope creep past what
  DESIGN/CURRICULUM asked to be checked.
- Splitting a compound rubric sentence into multiple checklist lines is restructuring, not
  invention — it does not need an `[inferred]` tag as long as every resulting line still traces
  directly to the source sentence.
- If turning the rubric text into a fair, self-checkable line requires adding a scenario or a
  threshold the rubric text does not state (e.g. deciding what "reachable" means operationally),
  write it anyway, tag it `[inferred]` inline, and add an `instructional_decisions` entry
  explaining the gap.
- The "How to self-check" section may add procedural detail (what command to run, what to look
  at) beyond the bare rubric text, since a student needs some minimal instruction on how to
  perform the check. Tag any such addition `[inferred]` unless it is already spelled out in the
  CURRICULUM item's `lane_tasks` or `support_material`.

## Status and the approval gate

`status: draft` until a human reviews it. Only a human sets `status: approved` —
`rubric-author` never sets it itself. When an addendum exists, approve it together with
the rubric it annotates; they must never drift out of sync (same node, same session/sequence, same
substance).
