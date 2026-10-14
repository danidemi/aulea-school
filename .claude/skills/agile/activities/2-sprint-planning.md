# Activity 2: Sprint Planning

Goal: decide with the human which PBIs to work on, then plan how each will be implemented.

Use the canonical terms from `references/ubiquitous_language.md` in plans and ADRs.

Read `references/do_and_donts.md` first and obey it. For each PBI that introduces a UX pattern
(table, destructive action, dialog, header, form), grep every screen for the same pattern and
state in the plan whether the PBI covers them or why not.

## Selecting PBIs

- Prefer the smallest possible subset. A single, complex PBI is a perfectly good sprint.
- Only pick PBIs that reached the Definition of Ready (see
  `activities/1-backlog-refinement.md`).

## Planning the implementation

For each selected PBI:

- Propose several sensible implementation choices, all coherent with existing ADRs in `adr/`.
- Always ground the plan in existing ADRs — check the development doesn't change something that
  should stay stable.
- If the human commits to a technological alternative not yet covered by an ADR, write a new ADR
  for it.
- If completing the PBI requires changing the tech stack, ask the human first and explain the
  rationale explicitly in the ADR before proceeding.
- Update the PBI with the agreed implementation plan.

When the technical/infrastructural overhead for a PBI is sensible, complex, or impactful on its
own, create a new dedicated PBI in the sprint for that overhead, separate from the feature PBI.

Move selected PBIs from `backlog/` to `active_sprint/` once planning is done.
