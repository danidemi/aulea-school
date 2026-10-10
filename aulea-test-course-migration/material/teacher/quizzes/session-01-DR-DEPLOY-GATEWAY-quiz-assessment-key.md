---
status: draft
kind: assessment
node_ref: DR-DEPLOY-GATEWAY
session: 1
sequence: "6"
title: "Checkpoint: gateway reachable on GKE — teacher key"
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

**Answer: A.** The rubric requires the gateway pod to be `Running`/`Ready` in GKE. `Pending`,
`CrashLoopBackOff`, and no pod at all are all fail states — the pod is not confirmed healthy in
any of them.

## Q2 (true/false) — P-OPS lane

**Answer: True.** The rubric names two separate conditions: the pod Running/Ready, **and** a
Service/Ingress exposing it. A healthy pod with nothing exposing it does not satisfy "a
Service/Ingress exposes it."

## Q3 (multiple choice) — P-DEV lane

**Answer: A.** The rubric explicitly states a default 404 from an unrouted path counts as a pass,
"provided it is the gateway responding, not a network timeout." B, C, and D all mean the gateway
never actually answered — no response reached the client — so none of them satisfy the rubric,
even though a 404 might look superficially similar to "the request failed."

## Q4 (short answer) — P-DEV lane

**Answer:** A 404 means the gateway itself received the request and produced a response — it is
reachable and operating, it just has no route configured for that path. A timeout means no
response arrived at all, so reachability itself is not confirmed. Accept any answer that
distinguishes "the gateway answered (even with an error status)" from "nothing answered."

## Q5 (practical) — joint (P-DEV runs, P-OPS confirms)

**Expected:** A response was received (not a timeout or connection error), with some HTTP status
code — 404 is an acceptable pass per the rubric, as is any other status code that shows the
gateway itself produced the response. Accept any answer consistent with the item's checkpoint
rubric in CURRICULUM: pass only if a response came back from the gateway; fail on timeout,
refused connection, or DNS failure.

*(`[risk]` — no store gives a concrete expected status code or address for this course's
environment; grade against the rubric's response-vs-timeout distinction, not against any single
expected number.)*
