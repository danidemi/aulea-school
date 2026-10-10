# Demo script spec

Covers the teacher's runbook for one `lecture_demo` CURRICULUM item — the instructor presents
content and also drives a live system in front of the group while students watch, without
typing themselves. Read `design/material_authoring_rules.md` first; this file covers what is
specific to demo scripts.

One file per lesson item, written by `demo-script-author`:

- Teacher runbook: `material/teacher/demo-scripts/session-NN-<node_ref>-demo-script.adoc` — the
  full sequence of setup, live actions, talking points, audience-attention cues, and a fallback
  for when the live system misbehaves. There is no student-facing copy — students watch the
  live system itself, not a paper.

## Why a demo needs a script

A live demonstration in front of a class is a real risk: a command can fail, a network can be
slow, a dependency can be in the wrong state. The demo script exists so the teacher never
improvises the sequence of actions live. Every step the teacher will physically do is written
down in advance, in the order it will be done, together with what could go wrong and what to do
instead.

## Document frontmatter (AsciiDoc attributes)

```adoc
= Demo script: The route model in Spring Cloud Gateway
:status: draft
:node_ref: PRQ-GATEWAY-ROUTE-CONFIG
:session: 1
:sequence: 7
:time_minutes: 15

[instructional_decisions]
****
* decision: "..."
  rationale: "..."
  confidence: stated | inferred | invented
  awaiting: instructional-designer
****
```

`:status:` is `draft` or `approved`, per `material_authoring_rules.md`. The
`instructional_decisions` block, when there is anything to record, is a fenced block right after
the title and before the first section, one bullet per entry — omit the block entirely when
there is nothing to record.

## Body sections

Four sections, always in this order. Every demo script has all four — a demo with no plausible
failure mode still needs a fallback section that says so explicitly, rather than omitting it.

### 1. Before class (setup)

Everything the teacher must have ready before the session starts: which system to have open,
which accounts/environments to be logged into, which state a system must already be in (a
namespace already deployed, a branch already checked out), and anything to verify works before
the students arrive.

```adoc
== Before class

* Have the gateway's route configuration file open in the editor, on the branch that shows the
  `+legacy/**+` predicate already declared (see PRQ-PATH-BASED-ROUTING, taught right after this
  item — do not pre-empt it here beyond what this node's own scope covers).
* Have a terminal open with a shell already positioned in the gateway project directory.
* [invented framing] Confirm network access to the demo environment works, since this room's
  connectivity is not recorded in any store.
```

### 2. Live sequence

The exact sequence of actions the teacher performs live, one numbered step per action, each
step pairing what to do with what to say. This is the runbook itself — a teacher who has never
run this demo before should be able to follow it action by action.

```adoc
== Live sequence

. *Show* the route configuration file. *Say:* "A route is declared with a predicate — the
  condition a request must match — and a list of filters — what happens to the request once it
  matches."
. *Run* [invented framing, placeholder]:
+
[source,placeholder]
----
<< exact command to start/reload the gateway with this configuration — no store gives the
   client's actual command line or tool version; confirm with the client before class >>
----
+
*Say:* "Watch the startup log for the route being registered."
. *Send* a request to the route from a second terminal or browser tab. *Say:* "This request
  matches the predicate we just declared, so it should reach the target service."
. *Point at* the response. *Say:* "This is the effect of the route/filter model this item
  covers: the request was directed by declared configuration, not by application code."
```

A step that needs an exact command, an exact URL, or an exact expected output that no store
supplies is written as a `[source,placeholder]` block per the "Honest gaps" rule in
`material_authoring_rules.md` — never invented to look concrete. Tag it
`[invented framing, placeholder]` inline so the teacher (or the client) knows to fill it in
before class, not during it.

### 3. What to watch for

What the audience should be looking at during each step, and the misconception this cohort is
likely to have at this point — the same purpose the slide model's `watch_for` note field serves,
carried into prose here since there is no separate notes structure in a demo script.

```adoc
== What to watch for

* [inferred] Learners with an Ops background may expect the route to be a network-level rule;
  point out explicitly that it is application-level configuration read by the gateway process,
  not a firewall or load-balancer rule.
* Watch the room, not only the screen, right after the request is sent — the pause before the
  response arrives is where the audience stops paying attention.
```

### 4. Fallback if the live system misbehaves

What to do if a command fails, a service does not respond, or the environment is in an
unexpected state. At minimum: one concrete fallback action (a pre-recorded screenshot/output to
show instead, a known-good branch/snapshot to fall back to, or a scripted "here is what would
appear" narration), never just "troubleshoot live in front of the class."

```adoc
== Fallback

* If the request in step 3 does not return the expected response, do not debug live. Switch to
  the pre-captured terminal output saved at
  [placeholder]`<< path to a saved transcript/screenshot of a known-good run — none exists yet;
  capture one during a dry run before this item is first taught >>` and narrate it as "this is
  what a working run shows."
* [invented framing] If the whole environment is unreachable, fall back to the diagram already
  used in `PRQ-SCG-BASICS`'s slides to narrate the same request path without a live system.
```

## Deriving content

- The live sequence must demonstrate the target node's `description` in DESIGN — every action
  in the sequence should exist to make one part of that description observable. Do not add
  steps that demonstrate content belonging to a different node; check `requires`/`enables` edges
  in DESIGN before adding a step that covers a different node's scope.
- If the CURRICULUM item's `duration_minutes` is tight, keep the live sequence short enough to
  fit inside it, plus a few minutes' margin for the fallback contingency — do not pad the script
  to look thorough.
- A `support_material` entry of kind `cheat_sheet`, `diagram`, or `config_template` attached to
  the same item in CURRICULUM is something to reference in the setup or live-sequence section
  (e.g. "have the cheat sheet open"), not something to duplicate wholesale into the script.
- The teacher's exact commands, exact tool versions, exact URLs, and any screenshot are almost
  never present in CURRICULUM or DESIGN — those stores describe what to teach, not the client's
  environment. Treat every one of these as an honest gap by default: write a `placeholder`
  marking what is needed and why it is not derivable from a store, per
  `material_authoring_rules.md`. Only skip the placeholder when the exact value is already
  stated verbatim somewhere in CURRICULUM or DESIGN (e.g. a command literally quoted in a node's
  `description`).

## Status and the approval gate

`status: draft` until a human reviews the file — in particular, until a human has actually
run the live sequence once (a dry run) and confirmed the exact commands and expected outputs
placeholders can be filled in with real values. Only a human sets `status: approved`;
`demo-script-author` never sets it itself.
