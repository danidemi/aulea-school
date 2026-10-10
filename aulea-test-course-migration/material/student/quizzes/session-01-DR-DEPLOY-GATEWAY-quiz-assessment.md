---
status: draft
kind: assessment
node_ref: DR-DEPLOY-GATEWAY
session: 1
sequence: "6"
title: "Checkpoint: gateway reachable on GKE"
time_minutes: 10
instructional_decisions:
  - decision: "EDITORIAL_GUIDELINES does not exist yet. Followed the CLAUDE.md fallback (plain language, no idioms/metaphors, literal direct terms) instead."
    rationale: "material_authoring_rules.md requires this fallback and a recorded note when specifications/editorial_guidelines.md is missing."
    confidence: stated
    awaiting: instructional-designer
  - decision: "Set time_minutes to 10, not the item's duration_minutes (15)."
    rationale: "quiz_spec.md states time_minutes covers the quiz itself, not the live checkpoint's full duration_minutes, which also includes the lane verification work itself (pod check, live HTTP test)."
    confidence: inferred
    awaiting: instructional-designer
  - decision: "Labeled each question with the lane (P-OPS or P-DEV) whose lane_task in CURRICULUM it checks, instead of leaving questions unlabeled or splitting the paper into two separate lane papers."
    rationale: "The item is multi_lane with two distinct lane_tasks: P-OPS confirms pod health and Service/Ingress reachability, P-DEV hits the gateway and confirms a response. Labeling keeps the single quiz file traceable to the rubric criterion each lane owns, without inventing a new file split CURRICULUM does not ask for."
    confidence: inferred
    awaiting: instructional-designer
---

## Q1 (multiple choice) — P-OPS lane

You run a command to check the gateway's pod status in GKE. Which result means the pod check
part of this checkpoint passes?

A. The pod shows `Running` and `Ready`.
B. The pod shows `Pending`, waiting to be scheduled.
C. The pod shows `CrashLoopBackOff`.
D. No pod exists yet for the gateway deployment.

*(Distractors B, C, D are `[invented framing]` — CURRICULUM/DESIGN name only the pass condition,
not the possible fail states, so these were constructed to test the same distinction.)*

## Q2 (true/false) — P-OPS lane

"A Service or Ingress must expose the gateway pod for this checkpoint to pass; the pod being
Running/Ready by itself is not enough." True or false?

## Q3 (multiple choice) — P-DEV lane

You send a test HTTP request from outside the cluster to the gateway's exposed address, on a
path with no configured route. Which outcome still counts as a **pass** for this checkpoint?

A. The gateway returns a 404 response.
B. The request times out with no response at all.
C. The connection is refused.
D. The DNS lookup for the gateway's address fails.

## Q4 (short answer) — P-DEV lane

State, in one sentence, why a default 404 response from the gateway counts as a pass, but a
network timeout on the same request does not.

## Q5 (practical) — joint (P-DEV runs, P-OPS confirms)

Send a test HTTP request from outside the cluster to your deployed gateway's exposed address (any
path). Report:

1. Whether you got a response at all, or a timeout/connection error.
2. If you got a response, the HTTP status code.

*(`[risk]` — no store gives a concrete cluster address, namespace, or expected status code for
this course's environment; use your own deployed gateway's actual exposed address and report
what you observe. This is a placeholder for a value none of the stores supply.)*
