# Demo guide spec

The **demo guide** is the trainer's script for one live demonstration: precise enough that, for a
step built around a terminal command, the trainer can copy-paste it as written. It is authored and
reviewed independently of every other material type — it does not name a path under
`material/student/`, and no student-facing file names its path either.

Two AsciiDoc files per CURRICULUM item whose `didactic_activity` is `demo`, both
under `material/teacher/demos/`. `session-NN` is the item's enclosing session's `session_number`;
`node_ref` is the item's own.

- `session-NN-<node_ref>-demo-guide.adoc` — the **script**: exactly what the trainer reads while
  running the demo. Header, mandatory rehearsal notice, Preconditions, Steps, Reset, Resume
  mid-demo, Live-failure fallback, and one short timing note. Nothing in this file explains
  *why* a choice was made or *how sure* the agent is about something beyond the inline
  `[stated]`/`[inferred]`/`[invented framing]`/`[risk]` tags — a trainer rehearsing or delivering
  live does not need the reasoning, only the tagged fact.
- `session-NN-<node_ref>-demo-guide-notes.adoc` — the **notes**: every `instructional_decisions`
  block, the full timing cross-check arithmetic, and any other reasoning about the guide itself
  (e.g. why a claim could not be verified). Read by the instructional designer during sign-off,
  never by the trainer during class.

Why one script per item, not per session: a demo is rehearsed and delivered as a single unit, and a
trainer teaching only part of a session still needs the whole script for the demo they are
actually running.

Why the script and the notes are separate files: the script is read live, under time pressure, in
front of a room — anything in it that is not an instruction or a tagged fact is noise the trainer
has to read past. Reasoning, confidence narration, and sign-off material belong where they can be
as long and as detailed as they need to be, without cluttering the document the trainer actually
follows.

---

## Why this document cannot be "verified"

The authoring agent has no access to the actual delivery environment — no target machine, no
installed toolchain, no live credentials. Every command, menu path, or expected output it writes
is a **grounded guess**, not a tested fact, unless the CURRICULUM item or a DESIGN
node it traces to states the exact detail directly.

This is a deliberate, accepted limit, not a defect to work around by inventing confidence the agent
does not have. Two things compensate for it:

1. Every command-shaped or output-shaped claim is tagged `[stated]` / `[inferred]` / `[invented
   framing]` / `[risk]` per `material_authoring_rules.md`, same as every other material type.
2. The guide carries a mandatory rehearsal notice (see "Header", below) telling the trainer to run
   the demo once, exactly as written, before teaching it live — this document is the rehearsal
   script, not a substitute for the rehearsal.

The agent may use local, read-only checks (e.g. `<tool> --version`, `<tool> --help`, `git
rev-parse`) to make a command's flags and syntax accurate for the tool version actually present in
this repository's sandbox — never to claim the trainer's own delivery environment was verified,
since it wasn't. Never run a command that mutates state, calls a network service, or could plausibly
be part of the demo itself; that would pollute the very environment the guide is trying to describe
from a clean start.

## Header (script file)

```asciidoc
= Demo guide — <title>
:status: draft
:session: NN
:node_ref: PRQ-… / DR-…
:target_minutes: 15
:language: it

[NOTE]
====
Rehearse this guide once, end to end, exactly as written, before teaching it live. Every command
and expected output below is a grounded guess from the course design, not a tested fact — flag
anything that does not match what you see, and update this file once corrected.
====
```

Nothing else goes between the attributes and this `[NOTE]` block — no `CURRICULUM:`/`DESIGN:`
provenance comments, no authoring trail. That reasoning, if worth keeping at all, belongs in the
notes file (see `instructional_decisions`, below); it is not something the trainer reads.

`:status:` — `draft` until a human reviews the guide and sets `approved`. The authoring agent never
sets `approved` itself, the same rule every other material type in this project follows.

Never mention the agent's own authoring sandbox or writing environment anywhere in the script
(e.g. "verified in the sandbox used to write this guide", "the machine this was generated on").
The trainer only needs the fact being asserted (a tested tool version, a tested behavior) — not
where or how the agent checked it. Provenance of a claim is carried by its `[stated]`/`[inferred]`
tag, not by prose about the authoring process.

## Localized labels

The script file is trainer-facing prose in the item's `:language:` — every structural label in it
must be written in that language, not left as the English field name used in this spec (which
exists only to name the field, for every author and reviewer, regardless of course language).
Loanwords already standard in the target language's technical register are kept as-is rather than
forced into an awkward native term.

Just one example: for `:language: it`, prefer `Precondizioni` to `Preconditions`, but it is safe to use `Reset`.

For any other `:language:`, apply the same principle (translate the prose-facing labels, keep
established loanwords) and record the mapping you used as an `instructional_decisions` entry in
the notes file so it is reused consistently across every demo guide in that course.

## Preconditions

One section, before step 1, stating everything that must already be true for step 1 to work:

- Tools and versions the demo assumes.
- Starting state: repo/branch/commit, seed data, running services, accounts already logged in.
- Network/credential requirements.
- Anything the audience should already have on their own screen, if this is a follow-along demo.

A precondition that can be checked is written as the actual command to run, not as an instruction
to the trainer to "verify" or "make sure" — e.g. `docker compose version`, not "the trainer should
check the Compose version installed." Same for a precondition that requires a starting artifact:
give the concrete steps, or the concrete file content, to produce it, not an instruction to
"prepare" or "ensure" it exists.

Do not leave a value as an angle-bracket placeholder when the agent can reasonably assert a
concrete one — assert it, tagged `[inferred]` if it is not directly grounded in a store. Reserve a
placeholder for values that genuinely vary per environment or per trainer (a project name prefix,
a local path) — never as a substitute for a value the agent could just state. This does not relax
"Honest gaps" in `material_authoring_rules.md`: a value the agent has no basis to assert at all
(a real screenshot, a client-specific credential) still gets an explicit `[risk]`-tagged
placeholder naming what is missing and why, not an invented-looking concrete value.

An honest gap here (a detail the agent could not ground in any store) is written as a `[risk]`-tagged
line naming exactly what the trainer must supply, never silently omitted. `[risk]`/`[inferred]`
tags stay inline in the script — only the reasoning behind them (why it could not be verified, what
alternative was considered) moves to the notes file.

## Steps

One numbered step per distinct thing the trainer does. Each step:

```asciidoc
=== Step N — <short label>

Trainer-only:: yes | no                 // no = students do this too, in parallel or right after
Deliberate failure:: no | yes — <what it demonstrates>   // only when the step is meant to error
Timing:: 2 min

Do::
  <exactly what the trainer types, clicks, or says — see "Action kinds" below>

Expect::
  <what should be visible/returned immediately after — prose, not a check>

Verify::
  <one concrete, checkable assertion the trainer can confirm before moving to the next step —
  distinct from Expect: "the pod's STATUS column reads Running", not "it should work">

Why::
  Mechanical: <why this step is technically necessary here>
  Teaches: <which DESIGN node/objective this step advances>

If it goes wrong::
  <the failure modes worth naming for this exact step, each with its fix — not a generic
  troubleshooting appendix; a trainer under time pressure reads this step, not a table of contents>
```

### Action kinds

A step's `Do::` is not always a shell command — never assume a terminal. Write whichever applies:

- **Command** — the literal string to run, in a fenced `[source,bash]` (or matching language)
  block, verbatim and copy-paste ready: no leading `$` prompt, no line-wrapping that would break a
  paste, placeholders wrapped in angle brackets and named in prose right after the block (e.g.
  `<CLUSTER_NAME>` — the value set in Preconditions).
- **UI interaction** — the exact click path ("Settings → Deploy → click *Enable*"), named menu
  items and buttons as they actually read, not paraphrased.
- **Narration** — what the trainer says or points out with no system interaction (e.g. drawing the
  audience's attention to a specific line of output already on screen).

## Verbatim output and volatile values

When `Expect::` or `Verify::` quotes real command output, mark anything that will differ at
delivery time — timestamps, generated ids, ports, pod names — as illustrative (e.g. `pod/api-<hash>
1/1 Running`) rather than presenting one run's literal values as if they always recur.

## Reset and resume

One section after the last step:

- **Reset**: how to return to the Preconditions' clean state, so the trainer can re-run the whole
  demo for another cohort.
- **Resume mid-demo**: if the demo is interrupted after step K, what the trainer needs to check or
  redo to safely continue from step K+1 rather than restarting from step 1.

## Live-failure fallback (script file)

One section holding what the trainer shows the room if the live demo breaks and cannot be fixed
in-class: pre-captured output, a screenshot description, or a recorded-outcome summary, plus one
line on how to pick the demo back up afterward (skip to the next item, or debrief from the
fallback material as if it had run).

An agent that cannot produce real fallback material (e.g. no image capability) writes an explicit
`[risk]`-tagged placeholder naming what a human still needs to capture, never a silent gap. State
only the gap and what is needed — do not restate here why the agent in general cannot verify
delivery-environment claims; that is covered once, for whoever authors the notes file, and is not
something the trainer needs repeated mid-script.

## Timing note (script file) and timing cross-check (notes file)

The script carries one short timing note near the header (next to `:target_minutes:`, not as a
trailing section): the total estimated minutes versus the item's `duration_minutes`, one line.

The full arithmetic — every step's `Timing::` plus setup, summed and compared against
`duration_minutes` in CURRICULUM, with the reasoning behind any setup-time
estimate — goes in the notes file instead. A mismatch is not corrected by silently rewriting the
budget — record it as an `instructional_decisions` entry (see below) so a human resolves it.

## instructional_decisions (notes file)

Any instructional-design call the agent had to make (how granular to split steps, how much
narration to script versus leave to the trainer's own words, what counts as a deliberate failure
worth keeping) is recorded as an `instructional_decisions` block in the notes file, the same
`awaiting: instructional-designer` convention every other material type uses — never in the script
file, and never buried only in step wording.

```asciidoc
[NOTE.instructional-decision]
====
Decision: <…>
Rationale: <…>
Confidence: stated | inferred | invented
Awaiting: instructional-designer
====
```

## Status

`:status: draft` until a human reviews the guide and sets `:status: approved:`. The authoring agent
never sets `approved` itself.
