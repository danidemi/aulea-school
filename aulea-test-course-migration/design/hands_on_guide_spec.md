# Hands-on guide spec

Covers both outputs of one `hands_on_practical` CURRICULUM item — the teacher setup guide and
the student solving guide — with one spec, since they describe the same exercise from two
angles. Read `design/material_authoring_rules.md` first; this file covers what is specific to
hands-on guides.

Two files per item, written together by `hands-on-guide-author`:

- Teacher setup guide: `material/teacher/hands-on/session-NN-<node_ref>-setup-guide.adoc` —
  how to prepare the environment before class, the exact steps to have ready, what "done
  correctly" looks like from the instructor's side, common failure points per lane, and how the
  checkpoint after the item will be verified.
- Student solving guide: `material/student/hands-on/session-NN-<node_ref>-solving-guide.adoc` —
  the exercise framing, the task(s) for each lane, step-by-step instructions to work through, and
  what "done" looks like — without answers or teacher-only content.

Both files trace to the same CURRICULUM item (`style: hands_on_practical`) and the same DESIGN
node(s) it teaches.

## The access-control line

The two files describe the same exercise, not two different exercises, but they cross the same
tree boundary as every other material type in this repo: `material/student/` carries zero
teacher-only content. Apply this test to every sentence you are about to place in the solving
guide: would a student reading it before attempting the exercise gain something that defeats the
exercise, or see instructor-only material? If yes, it goes in the setup guide only.

Concretely:

| Content | Setup guide (teacher) | Solving guide (student) |
|---|---|---|
| Environment prerequisites, versions, accounts to provision before class | Yes | No — the student's environment is already provisioned by the time they read this |
| Exact commands the instructor runs to prepare shared infrastructure | Yes | No |
| The exercise framing and task the learner performs | Yes, restated for context | Yes — this is the guide's core content |
| Step-by-step instructions the learner follows | No (the setup guide is not a copy of the solving guide) | Yes |
| The answer, the exact command output, or the finished configuration | Yes, as "what done looks like" for the instructor to verify against | No — see below |
| What "done" looks like, learner-facing (a checkpoint the learner can self-verify: "the endpoint responds", "the pod is Running") | Yes, mirrored | Yes, phrased as a checkpoint the learner runs themselves, not as a revealed answer |
| Common failure points to watch for, per lane | Yes | No — flagging a mistake in advance can remove the productive struggle the exercise is designed to produce |
| How the checkpoint after this item will be verified | Yes | No — the solving guide ends with the exercise, not with the grading rubric of the following checkpoint item |

"What done looks like" appears in both files but at different resolution: the setup guide states
it as a verification the instructor performs (has access to internals, logs, admin views); the
solving guide states it as an observation the learner can make from their own vantage point
(a response code, a running pod, a passing local check) — a description of a symptom, not a
worked solution.

## Both lanes get a real task

This repository's curriculum uses two personas per hands-on item most of the time
(`delivery_pattern: multi_lane`, `lane_tasks` naming `P-DEV`/`P-OPS`, occasionally
`single_lane`/`persona_led`). Per the curriculum's own design directive (`.claude/reference/
curriculum.schema.json`'s `lane_task` doc, echoed in `slide_model_spec.md`), each active lane
needs a real role, not busywork. The solving guide must therefore address every lane the item's
`lane_tasks` names, using the exact `task` text from CURRICULUM as the anchor for what that lane
does — never invent a different split. When `role` is `observer` or `skip` for a lane, the
solving guide still names what that lane is doing (watching, or explicitly sitting this item out)
rather than silently omitting them.

## Teacher setup guide frontmatter

AsciiDoc document attributes at the top of the file:

```asciidoc
= Setup guide: Building a container image for the gateway
:status: draft
:node_ref: PRQ-CONTAINERIZE-GATEWAY
:session: 1
:sequence: 4
:audience: teacher

[.instructional_decisions]
====
* Decision: Scoped the "done correctly" check to a successful local `docker build`, not a
  registry push, since LOGISTICS does not confirm every participant has registry write access.
  Rationale: a stricter check risks blocking on infrastructure outside the lesson's own scope.
  Confidence: inferred. Awaiting: instructional-designer.
====
```

Omit the `instructional_decisions` block entirely when there is nothing to record.

## Teacher setup guide body

```asciidoc
== Before class

* Provision: a container registry each participant (or pair) can push to; Docker installed and
  working on every machine — `[stated]`, per LOGISTICS.
* Have ready: a sample Dockerfile for a Spring Boot / Spring Cloud Gateway image, matching the
  `config_template` support material named on this CURRICULUM item.
* Verify beforehand: `docker build` succeeds against the sample Dockerfile on a clean checkout,
  so a broken base image is caught before the room finds it.

== What the lanes do

P-DEV (contributor)::
Authors/maintains the Dockerfile and application build for the gateway image. `[stated]`, from
the item's `lane_tasks`.

P-OPS (contributor)::
Operates the image build/publish pipeline and container registry. `[stated]`, from the item's
`lane_tasks`.

== Common failure points to watch for

* P-DEV lane: a Dockerfile that copies the wrong build artifact path — the most common cause of
  an image that builds but will not start. `[inferred]`.
* P-OPS lane: registry authentication left unconfigured until the push step, costing time mid-
  exercise. `[inferred]`.

== What done correctly looks like

`docker build` completes without error and `docker run` on the resulting image starts the
gateway process without a crash loop. If the item's lane tasks include a registry push, the image
appears in the registry under the expected tag.

== How the following checkpoint will be verified

This item feeds directly into `PRQ-GKE-DEPLOY-GATEWAY` and then the `DR-DEPLOY-GATEWAY`
checkpoint, whose rubric requires the gateway pod Running/Ready and reachable. Confirm the image
built here is the one referenced by the deployment manifests used in that later step.
```

## Student solving guide frontmatter

```asciidoc
= Solving guide: Building a container image for the gateway
:status: draft
:node_ref: PRQ-CONTAINERIZE-GATEWAY
:session: 1
:sequence: 4
:audience: student
```

No `instructional_decisions` block is required on the student file unless a decision changes
what the student sees (e.g. a scope-narrowing choice the learner should know about); when in
doubt, put the decision record in the setup guide only, since `instructional_decisions` is a
phase-3 handover conversation between subagent and instructional designer, not learner-facing
content.

## Student solving guide body

```asciidoc
== The exercise

Package the Spring Cloud Gateway application into a container image ready for cluster
deployment. `[stated]`, from `PRQ-CONTAINERIZE-GATEWAY`.

== Your task

If you are P-DEV::
Author and maintain the Dockerfile and application build for the gateway image.

If you are P-OPS::
Operate the image build and publish pipeline, and the container registry the image goes to.

== Steps

. Write a Dockerfile for the gateway application, using the sample handed out in class as a
  starting point.
. Build the image locally.
. Confirm the image starts the gateway process without crashing.
. If your lane's task includes it, push the image to the team's registry under the agreed tag.

== What done looks like

* `docker build` completes without error.
* `docker run` on the built image starts the gateway process — no crash loop.
* If a registry push is part of your task, the image appears in the registry under the expected
  tag.
```

## Deriving the guides

- The exercise framing and both lanes' tasks come from the CURRICULUM item's own fields:
  `title`, `description` context via the DESIGN node's `description`, and `lane_tasks[].task`
  verbatim. Do not paraphrase a `task` string into something materially different from what
  CURRICULUM says that lane does.
- "What done looks like" derives from the item's own scope and, when the item feeds a later
  `checkpoint`, that checkpoint's `rubric` — read forward in CURRICULUM to find it, since the
  checkpoint is usually the very next or a nearby item sharing the same `node_ref` lineage.
- The setup guide's "common failure points" are necessarily `[inferred]` unless a DESIGN node
  carries a note about a known misconception — CURRICULUM/DESIGN do not currently carry a
  dedicated field for instructor pitfalls, so tag these entries and, if the inference feels
  thin, add an `instructional_decisions` entry rather than asserting it as fact.
- If a support material entry with `kind: config_template` or `kind: exercise_sheet` is named on
  the item, treat it as the concrete artifact both guides should reference, not as a separate
  material to reproduce here — the guides describe how to use it, not duplicate it.

## Status and the approval gate

`status: draft` on both files until a human reviews them. Only a human sets `status: approved` —
`hands-on-guide-author` never sets it itself. Approve the setup guide and the solving
guide together; they describe the same exercise and must never drift out of sync (same task
split per lane, same definition of done, same node coverage).
