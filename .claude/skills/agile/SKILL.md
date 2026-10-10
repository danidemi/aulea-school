---
name: agile-scrum-pm
description: "Manage a project's development using a lightweight SCRUM process (backlog, sprints, ADRs) with Claude acting as the whole development team. Use when the user wants to organize a project as a SCRUM-style backlog, run backlog refinement, plan or run a sprint, do a sprint review/retrospective, check project status ('how many PBIs are in the backlog', 'what's the sprint status', 'what should we do next'), or asks to set up this workflow in a new project ('/agile-scrum-pm', 'set up scrum here', 'run backlog refinement')."
---

# Agile SCRUM Project Management

Runs a SCRUM-inspired process for a software project, with Claude filling the role of the
development team (architect, developers, QA) and the human filling the role of Product Owner.
This skill is process-agnostic to the *product* — it works the same whether the project is a
web app, a CLI tool, or anything else.

## Finding the SCRUM root

The SCRUM root is not always the repo root or the code root — in a repo that separates spec from
code, it can live in its own tree (e.g. `agile/<project>/` next to an unrelated
`<project>/` source tree). Locate it by finding the folder that contains both a `backlog/` and an
`active_sprint/` subfolder, searching from the human's stated location or the current directory
outward/downward as needed. If none is found, or more than one candidate exists, ask the human
which folder is the SCRUM root instead of guessing.

## Folder structure (the "SCRUM root")

Once located, the SCRUM root is organized like this:

- `references/`
  - `vision.md` — the project vision; stays constant during development.
  - `tech_reference.md` — where the source lives, stack notes, and other constant tech facts.
  - `do_and_donts.md` — running log of process decisions from retrospectives. Read before backlog
    refinement and before development; obey what's in there. Append only, never rewrite past
    entries. Keep it short and compact it if it grows too large (see activity 5).
  - `ubiquitous_language.md` — short glossary of the project's domain vocabulary (concepts, roles,
    actions, screens, named UI components), with `ul/<slug>.md` files for overflow definitions.
    Read it at the start of every activity below and use its canonical terms; see
    `activities/0-ubiquitous-language.md` for how it's built and kept up to date.
- `backlog/` — Product Backlog Items (PBIs) not yet scheduled, plus templates named
  `_<kind>.template.md` (e.g. `_bug.template.md`, `_story.template.md`, `_task.template.md`).
- `active_sprint/` — PBIs being developed in the current sprint.
- `past_sprints/sprint_<timestamp>/` — archived sprints, one folder per sprint, each PBI plus a
  `review.md`. Granularity can vary (e.g. `sprint_26_08_20` vs. the preferred one
  `sprint_26_08_22_15_56`) — match whatever pattern existing folders already use in that project
  rather than enforcing one format. Grows without bound over time; compact older folders on
  explicit human request (see `activities/6-compact-past-sprints.md`), never automatically.
- `adr/` — Architecture Decision Records. Always read and obeyed for new development, to keep the
  project technically coherent across sprints.

## PBI attachments (images, screenshots, logs)

Any image or log is durable evidence, not disposable chat context — never let one the human
provides, or one you produce as verification, simply vanish at the end of a turn. Save it as a
file next to the PBI it belongs to: `<same folder as the PBI>/assets/<pbi-id>/<slug>.<ext>`
(e.g. `backlog/assets/LOGIN-001/wireframe.png`, or
`active_sprint/assets/TESTDATA-001/seed-run.png`), and reference it from the PBI's own Markdown
with a relative link so it's discoverable from the file alone. When a PBI moves between folders
(backlog → active_sprint → past_sprints/sprint_<timestamp>), move its `assets/<pbi-id>/` folder
with it. Skip this only for an image that's genuinely disposable (e.g. a scratch sketch fully
superseded by a later one already saved).

## Bootstrapping a new project

If asked to set this process up in a project that doesn't have this structure yet:

1. Confirm the SCRUM root location with the human if it's not obvious (repo root vs. a subfolder).
2. Create the five folders above.
3. Copy `templates/_bug.template.md`, `templates/_story.template.md`, `templates/_task.template.md` from this skill into the
   new project's `backlog/`.
4. Create empty `references/vision.md`, `references/tech_reference.md`,
   `references/do_and_donts.md`, and `references/ubiquitous_language.md` (header only, see
   `activities/0-ubiquitous-language.md`), and interview the human briefly to seed `vision.md` and
   `tech_reference.md` (at minimum: what the project is, who it's for, where the code lives). The
   glossary itself stays empty until there are real PBIs to extract terms from.
5. Do not invent ADRs or PBIs — only create structure and the templates.

## Status check

Whenever the human asks about project status, progress, or "what's next" — answer without running
a full activity. Read the SCRUM root and report:

- Backlog: count of PBIs in `backlog/` (exclude `_*.template.md` files), and how many look
  DoR-ready vs. still DRAFT (see `activities/1-backlog-refinement.md` for the DoR checklist — skim
  each PBI's `Status:` line and whether it has clear acceptance criteria / DoD, don't do a full
  interview). Match `Status:` by its leading word only (`DRAFT`, `READY`, `IN PROGRESS`, `DONE`) —
  the rest of the line can carry free text, e.g. `DONE — accepted at sprint review 2026-08-20`.
- Active sprint: count and list of PBIs in `active_sprint/`, with their status
  (`DRAFT`/`READY`/`IN PROGRESS`/`DONE`, matched the same tolerant way).
- Past sprints: how many archived, and the date of the most recent one.
- Open ADRs count, and whether `do_and_donts.md` has entries newer than the last retrospective you
  can see reflected in the current sprint's approach.
- A one-line recommendation for the next activity to run, using this rule of thumb:
  - `active_sprint/` empty and backlog has DoR-ready PBIs → recommend **Sprint Planning**.
  - `active_sprint/` has PBIs not all `DONE`/`IN PROGRESS`-reviewed → recommend **Sprint** (keep
    developing) or **Sprint Review** if development looks finished.
  - `active_sprint/` has PBIs marked reviewed/DONE and not yet archived → recommend **Sprint
    Review** (to close it out) or **Sprint Retrospective** if review already happened.
  - `active_sprint/` empty and backlog has no DoR-ready PBIs → recommend **Backlog Refinement**.

Keep this reply compact — numbers and one recommendation, not a full report, unless the human asks
for detail.

## Activities

Each activity is a separate file — load only the one you're about to run, don't load all of them
up front:

0. `activities/0-ubiquitous-language.md` — extract/maintain the domain glossary.
1. `activities/1-backlog-refinement.md` — turn PBIs into Definition-of-Ready items.
2. `activities/2-sprint-planning.md` — pick PBIs for the sprint, plan how to build them, write ADRs.
3. `activities/3-sprint.md` — develop the sprint's PBIs.
4. `activities/4-sprint-review.md` — get human sign-off, archive the sprint, gather new PBIs.
5. `activities/5-retrospective.md` — capture one do and one don't for `do_and_donts.md`.
6. `activities/6-compact-past-sprints.md` — compact old `past_sprints/` PBIs to their durable
   essentials. Run only when the human explicitly asks (e.g. "compact past sprints") — never
   automatically.
7. `activities/X-new-pbi.md` — collect human feedback to create new PBIs.

If the human's request maps clearly to one activity, load that file and follow it. If it's
ambiguous, ask which activity they mean, or use the status check above to suggest one.

## PBi Statues

* `DRAFT` — The PBI has just been logged or captured as an idea, key details are still incomplete, needs refinement.
* `READY` — The PBI is fully clarified, estimated, and meets the team's Definition of Ready (DoR).
* `IN_PROGRESS` — Work on the PBI has officially started during the current Sprint.
* `IN_REVIEW` — The implementation is being reviewd.
* `DONE` — The PBI fulfills the acceptance criteria and completely satisfies the team's Definition of Done (DoD).
* `DISCARDED` — The PBI is deemed obsolete, duplicate, out of scope.