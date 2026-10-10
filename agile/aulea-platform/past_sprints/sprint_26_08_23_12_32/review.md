# Sprint review — sprint_26_08_23_12_32

Sprint ran 2026-08-22 to 2026-08-23. Scope: 8 stories, developed strictly sequentially —
see `sprint.md` for the full plan and development sequence.

## Outcome

7 of 8 stories accepted as DONE by the human on 2026-08-23:

* **AUTH-UX-001** — sign-in page, header sign-in button, email/password login. Accepted.
* **LOGOUT-001** — log-out control. Accepted.
* **UI-FOUNDATION-001** — shadcn/ui adoption + screen restyle. Accepted after the human's
  own visual review of `/`, `/signup`, `/login`, `/courses`, `/courses/:id/quizzes` in a
  browser (its DoD required this explicitly; no such review had happened before review).
* **TENANT-001** — tenant check/creation on first login. Accepted.
* **QUIZ-DASHBOARD-001** — quiz dashboard (list/delete/re-upload). Accepted.
* **QTI-22-IMPORT** — QTI 2.2 quiz upload. Accepted, with the structural-only (not full XSD)
  format check explicitly accepted as a deliberate scope reduction to revisit in a future
  sprint.
* **DEPS-001** — dependency vulnerability cleanup. Accepted, including the two remaining
  accepted-risk vulnerability chains and the unrelated `tsconfig.json` bug fix found during
  verification.

**COURSE-001** — course dashboard (list/sort/create/select) — **not accepted**, rework
needed:
* the built sort control is a "Sort by:" dropdown (as drawn in the story's own wireframe at
  grooming); the human wants standard column-header click-to-sort instead: 1st click
  ascending, 2nd click descending, 3rd click removes sorting, with a visible sort-direction
  indicator on the active header
* the story's Definition of Done and wireframe were corrected in place and the story stays
  `IN PROGRESS` in `active_sprint/`, carried into the next sprint as unfinished work rather
  than sent back through backlog grooming — the gap was a UI detail, not a missing
  requirement

## Gaps addressed at review

Both gaps flagged in `sprint.md` for review were resolved:

1. **No browser/Playwright click-through anywhere this sprint.** The stated reason
   ("no such tooling exists in this repo") was checked at review and found **wrong**:
   `npx playwright --version` returns `1.62.1`, and an earlier sprint (SIGN-UP-001, see
   `past_sprints/sprint_26_08_22_15_56/review.md`) already ran one ad hoc browsing-only
   Playwright pass. A follow-up backlog story,
   `backlog/story_browser_e2e_testing.md` (E2E-BROWSER-001), was created to add proper
   Playwright infra to `aulea-platform` and cover the screens shipped so far.
2. **No human visual sign-off on UI-FOUNDATION-001.** The human reviewed the rendered pages
   directly and accepted the story (see above).

## What worked well

* Flagging both cross-cutting gaps explicitly in `sprint.md` (rather than burying them
  inside each story's own Verification section) meant both got resolved at review instead of
  silently carried forward again.

## What to change

* The "no browser-automation tooling exists in this repo" claim was made and repeated
  across all 8 stories' Verification sections without being checked — a single
  `npx playwright --version` at review disproved it in seconds, and a prior sprint's review
  file already contradicted it. A claim like this should be verified once, not assumed and
  copy-pasted across every story.
* Same root cause, second instance: QTI-22-IMPORT's scope reduction was justified by "no
  network access to fetch the [QTI 2.2 XSD] schema" — also wrong; internet access was in
  fact available. The human flagged both instances at this review: environment-capability
  claims (tooling installed, network reachable, etc.) need a live check at the time they're
  made, not an assumption carried from memory or an earlier session state, since the
  environment can change mid-session.

See `references/do_and_donts.md` for the entries carried forward from this retrospective.
