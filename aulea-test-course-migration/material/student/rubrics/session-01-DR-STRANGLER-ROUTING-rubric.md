---
status: draft
node_ref: DR-STRANGLER-ROUTING
session: 1
sequence: "10"
item_type: checkpoint
title: "Checkpoint: legacy-vs-new traffic split"
addendum: true
instructional_decisions:
  - decision: "EDITORIAL_GUIDELINES does not exist yet. Followed the CLAUDE.md fallback rule instead: avoid idioms and metaphors, use literal and direct terms, prefer plain language, prioritize clarity over rhetoric."
    rationale: "material_authoring_rules.md requires this fallback and a recorded instructional_decisions entry when specifications/editorial_guidelines.md is missing."
    confidence: stated
    awaiting: instructional-designer
  - decision: "The 'How to self-check' section describes the check generically (send a request to /legacy/**, send a request to a migrated path) instead of naming actual path examples or microservice names."
    rationale: "No store gives concrete path names for this item. The CURRICULUM item's own rubric text is generic, and item 10 carries no support_material of its own. Inventing example paths (e.g. /orders/**) would be content not grounded in any store."
    confidence: inferred
    awaiting: instructional-designer
  - decision: "The self-check section points students to the test_script produced for sequence 9 (PRQ-LEGACY-VS-NEW-ROUTING-IMPL) as the likely tool for firing sample requests, rather than assuming a new script for the checkpoint itself."
    rationale: "Sequence 9's support_material lists a 'test_script: Script of sample requests to fire at the gateway to confirm the split,' the closest artifact in CURRICULUM to what a student would use here. This item's own entry has no support_material, so pointing to the neighboring item's material is the closest grounded option available, tagged as belonging to a different sequence item."
    confidence: inferred
    awaiting: instructional-designer
---

# Checkpoint: legacy-vs-new traffic split

Covers `DR-STRANGLER-ROUTING` (session 1, sequence 10).

## Pass/fail checklist

Check every line below. All lines must pass for the checkpoint to pass.

- [ ] A request to a `/legacy/**` path is routed to the legacy system.
- [ ] A request to a migrated path is routed to the corresponding microservice.
- [ ] Both checks above are verified live against the deployed gateway (not against a
      config file, code review, or a description of expected behavior).
- [ ] Both participants (the Dev and the Ops participant) take part in verifying the
      split — the check is not done by only one of them.

## How to self-check

Send a test HTTP request to a path under `/legacy/**` and confirm the response comes from
the legacy system. Send a test HTTP request to a path that has been migrated to a
microservice and confirm the response comes from that microservice, not from the legacy
system. Do this against the actual running, deployed gateway.

`[inferred]` The sample-request script built in sequence 9 ("Script of sample requests to
fire at the gateway to confirm the split," `PRQ-LEGACY-VS-NEW-ROUTING-IMPL`) is the
intended tool for firing these test requests — reuse it here rather than writing new
requests from scratch.

`[inferred]` No store lists the exact paths or microservice names your team is using —
these come from the route configuration your team built in sequence 9, not from any
course material. Use your own team's actual `/legacy/**` paths and migrated paths for
this check.

Both participants should take part: the Dev participant confirms the route rules match
what was intended, and the Ops participant fires the test requests and confirms the split
observed on the live system.
