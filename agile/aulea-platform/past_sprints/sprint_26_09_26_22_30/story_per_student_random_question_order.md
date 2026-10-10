ID: QUIZ-RANDOM-QUESTION-ORDER-001

Status: DONE

Priority: Medium

Effort: 5

Note: shares implementation ground with `QUIZ-RANDOM-ANSWER-ORDER-001` (per-student
randomization at session-start, similar attribution requirements for scoring/breakdown/monitoring).
Kept as a separate PBI, but plan both into the same sprint if either is picked.

Depends on: QUIZ-SESSION-PER-STUDENT-DELIVERY-001 (same sprint) — that tech PBI owns the
persisted per-connection order, the connection-scoped items endpoint, and the `quiz_sessions`
force-shuffle columns this story wires a toggle onto.

As:
a `trainer`

I want to:
choose, when starting a quiz session, whether each student receives the session's questions in a
random order that's independent per student (e.g. student 1 gets [1, 4, 3, 2], student 2 gets
[3, 4, 1, 2])

So that:
students who peek at a classmate's screen during the session can't gain an advantage from seeing
the same question at the same time, while I can still disable this when question order matters
(e.g. for scaffolded quizzes where later questions build on earlier ones)

Renamed at sprint planning (2026-09-22, PO-approved): the setting is "force shuffle questions",
not a plain on/off — see ADR-0013. Off does not mean "never shuffle"; it means "honor the
session's `qti-ordering shuffle` attribute as authored". This is a deliberate behavior change
beyond opt-in: quizzes already authored with `shuffle="true"` (the `quiz-author` default)
start shuffling per student even without the trainer touching this setting, once this and
`QUIZ-SESSION-PER-STUDENT-DELIVERY-001` ship. Flagged cross-cutting in `active_sprint/sprint.md`.

Definition of Done:
* when starting a quiz session, the trainer can turn "force shuffle questions" on or off
* the setting defaults to off; off means the session's own `qti-ordering shuffle` attribute
  decides per section (a section with no `qti-ordering` or `shuffle="false"` stays in authored
  order; `shuffle="true"` is genuinely shuffled per student, which it is not today)
* when on, every section is shuffled per student regardless of its own `shuffle` attribute
* each connected student is independently assigned their own shuffled order when shuffling
  applies; two students are not guaranteed (and in practice unlikely) to see the same order
* scoring, the answer breakdown, and session monitoring correctly attribute each answer to its
  question regardless of the order it was presented in (no code change needed there — see
  ADR-0013's attribution note; a test proves it rather than assumes it)
* verified with automated tests covering all four combinations of {force on, force off} ×
  {section `shuffle="true"`, `shuffle="false"`}, plus manual verification with two simultaneous
  test student sessions (two separate Playwright browser contexts, or one normal + one incognito
  window — `connectionId` is `localStorage`-scoped per browser, so two tabs of the same browser
  are the same student)
