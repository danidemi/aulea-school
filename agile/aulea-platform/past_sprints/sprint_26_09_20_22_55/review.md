# Sprint Review — sprint_26_09_20_22_55

All four items accepted by the human as-is. Marked `DONE` and archived here.

## Items

* **QUIZ-CONNECTION-INTEGRITY-001** — joining a `stopped` session now returns `409`
  instead of creating a connection; session Results excludes join-only ("ghost")
  connections and correctly scores a genuine zero-answer submission as `0/0` instead of
  flagging it as needing manual grading.
* **BUG-QUIZ-REFRESH-DUP-SESSION** — the quiz-taking page stores its connection id in
  `localStorage` and reuses it on reload, so refreshing no longer creates a duplicate
  session connection.
* **QUIZ-TAKE-URL-LINK-001** — the session's take-URL is now a clickable link
  (`target="_blank"`) with a `lucide-react` external-link icon. `lucide-react` was added
  as a new runtime dependency of `client/`, recorded in ADR-0012.
* **QUIZ-SESSION-HISTORY-001** — new `GET /api/quizzes/:quizId/sessions` endpoint and
  `QuizSessionHistoryPage` (`/quizzes/:quizId/sessions`), reached via a new "Sessions"
  button on each quiz row in `QuizzesSection`. Reuses the existing Monitor page
  unmodified.

## Verification at review time

Both packages: `server` 167 tests passing, `client` 85 tests passing, `tsc -b` clean on
both. No commits were made during the sprint; changes are staged/present in the working
tree pending the human's own commit.

## Deduced / observed

* **QUIZ-CONNECTION-INTEGRITY-001** had previously been marked `DONE` and archived in an
  earlier session on verbal approval alone, with none of its DoD actually implemented.
  Caught during this sprint's backlog grooming by reading the actual repo code — see the
  `sprint_26_09_20` entry in `references/do_and_donts.md`. Reopened, re-implemented, and
  re-verified this sprint.
* **lucide-react** was wrongly assumed to already be available (thought to be bundled
  via shadcn/ui). Verified absent (`node_modules`, `package-lock.json`, no icon usage
  anywhere in the codebase), then added as a new dependency with the human's explicit
  approval and an ADR (ADR-0012), per CLAUDE.md's tech-stack-change rule.
* Known open gaps, accepted as out of scope for this sprint rather than blocking:
  * `maxScore` for a from-scratch zero-answer quiz submission still renders as `0`
    (the quiz's true total possible points), not corrected here — tracked by the
    still-`DRAFT` `backlog/bug_quiz_empty_answer_wrongly_needs_manual_grading.md`.
  * `BUG-QUIZ-REFRESH-DUP-SESSION`'s localStorage fix was unit-tested only; no
    e2e/manual browser verification was run.
  * `QUIZ-TAKE-URL-LINK-001`'s new icon/link was verified via DOM assertions only; no
    screenshot/visual check was run.
