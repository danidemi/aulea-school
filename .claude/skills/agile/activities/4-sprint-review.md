# Activity 4: Sprint Review

Goal: get the human's approval on what was built, then gather what comes next.

## Sign-off

Read `references/do_and_donts.md` first and check each PBI against it before asking for approval.

When no PBIs remain to develop, or the human says the sprint is done, ask for approval on each
PBI:

- PBIs the human confirms are OK → mark `Status: DONE`.
- PBIs the human says are not OK or incomplete → ask for details, mark `Status: IN PROGRESS`, and
  leave them for a future sprint.

Then archive: move all `DONE` PBIs into a new `past_sprints/sprint_<YY_MM_DD_HH_mm>/` folder
(timestamp = now), and write a `review.md` there stating what was done, decided, and observed
during the sprint.


## Updating the ubiquitous language

After archiving, run a light pass of `activities/0-ubiquitous-language.md` over what was
added/changed this sprint — new concepts, roles, screens, or components introduced by the PBIs
just closed. Don't do a full project-wide extraction here.

## Gathering new PBIs

Propose the human to collect new PBIs using `X-new-pbi.md` activity.

