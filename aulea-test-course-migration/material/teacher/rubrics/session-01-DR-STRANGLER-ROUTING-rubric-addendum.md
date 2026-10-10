---
status: draft
node_ref: DR-STRANGLER-ROUTING
session: 1
sequence: "10"
rubric_path: material/student/rubrics/session-01-DR-STRANGLER-ROUTING-rubric.md
title: "Addendum: legacy-vs-new traffic split"
instructional_decisions:
  - decision: "Recorded grader guidance for two situations the student checklist deliberately does not spell out in advance: partial participation on the 'both participants verify' line, and telling apart a legacy-system response from an unrouted-gateway response that happen to look alike."
    rationale: "Both are teacher-only tie-breaks that would prime students if disclosed before the check, per rubric_spec.md's criteria for when an addendum is warranted (grader-only tie-breaking notes, known failure modes)."
    confidence: inferred
    awaiting: instructional-designer
---

# Addendum: legacy-vs-new traffic split

Teacher-only notes for
`material/student/rubrics/session-01-DR-STRANGLER-ROUTING-rubric.md`. Do not share this
file or its content with participants before the checkpoint runs.

## Tie-breaking: "verified by both participants"

The rubric text requires the split to be "verified live against the deployed gateway by
both participants." If only one participant actually fires requests and narrates the
result, while the other watches silently without confirming anything themselves, treat
the "both participants" line as a fail — a participant who only observes has not verified
anything. Both participants must each state, out loud, what they checked and what they
saw. `[inferred]`

## Known failure mode: a look-alike response

A response from the legacy system and a default response from an unrouted path at the
gateway itself can look similar to a student reading only an HTTP status code (for
example, both might return a generic error or a plain-looking page). Before marking the
"routed to the legacy system" line as a pass, confirm the response actually originated
from the legacy system — check response headers, body content, or logs that identify the
legacy system as the source — rather than accepting any response as proof of correct
routing. A response that the gateway generated itself (for instance, because no matching
route existed) must not be scored as a pass for this line, even though it is technically "a
response." `[inferred]`
