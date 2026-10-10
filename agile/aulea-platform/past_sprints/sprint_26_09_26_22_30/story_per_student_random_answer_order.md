ID: QUIZ-RANDOM-ANSWER-ORDER-001

Status: DONE

Priority: Medium

Effort: 5

Note: shares implementation ground with `QUIZ-RANDOM-QUESTION-ORDER-001` (per-student
randomization at session-start, similar attribution requirements for scoring/breakdown/monitoring).
Kept as a separate PBI, but plan both into the same sprint if either is picked.

Depends on: QUIZ-SESSION-PER-STUDENT-DELIVERY-001 (same sprint) — that tech PBI owns the
persisted per-connection order, the connection-scoped items endpoint, the XML reorder/serialize
step, and the `quiz_sessions` force-shuffle columns this story wires a toggle onto.

As:
a `trainer`

I want to:
choose, when starting a quiz session, whether each student receives the answer choices of each
question in a random order that's independent per student (e.g. for a question with choices
a, b, c, d, student 1 sees [d, a, c, b] while student 2 sees [c, a, d, b])

So that:
students who peek at a classmate's screen during the session can't gain an advantage from seeing
the same answer position at the same time, while I can still disable this when answer order
matters (e.g. ordered-list questions or answers meant to be read in a specific sequence)

Renamed at sprint planning (2026-09-22, PO-approved): the setting is "force shuffle answers", not
a plain on/off — see ADR-0013. Off does not mean "never shuffle"; it means "honor each item's own
`qti-choice-interaction shuffle` attribute as authored". This is a deliberate behavior change
beyond opt-in: items already authored with `shuffle="true"` (the `quiz-author` default)
start shuffling per student even without the trainer touching this setting, once this and
`QUIZ-SESSION-PER-STUDENT-DELIVERY-001` ship. Flagged cross-cutting in `active_sprint/sprint.md`.
Scope is `qti-choice-interaction` items only (matches ADR-0011's existing rendering-support
boundary — an unsupported item is never reordered). `qti-simple-choice fixed="true"` choices stay
in their authored position under force-shuffle too; this has no real authored case in this repo or
in `aulea-plugin-jinja2` today (grepped, zero hits), so it is not exercised by this story's own
tests — flagged as an assumption for review.

Definition of Done:
* when starting a quiz session, the trainer can turn "force shuffle answers" on or off,
  independently of the force-shuffle-questions setting
* the setting defaults to off; off means each `qti-choice-interaction`'s own `shuffle` attribute
  decides (an item with `shuffle="false"` stays in authored order; `shuffle="true"` is genuinely
  shuffled per student, which it is not today)
* when on, every applicable question's choices are shuffled per student regardless of the item's
  own `shuffle` attribute
* each connected student is independently assigned their own shuffled choice order when shuffling
  applies; two students are not guaranteed (and in practice unlikely) to see the same order
* scoring, the answer breakdown, and session monitoring correctly attribute each response to its
  actual choice regardless of the order it was presented in (no code change needed there — see
  ADR-0013's attribution note; a test proves it rather than assumes it)
* verified with automated tests covering all four combinations of {force on, force off} ×
  {item `shuffle="true"`, `shuffle="false"`}, plus manual verification with two simultaneous test
  student sessions (two separate Playwright browser contexts, or one normal + one incognito
  window — `connectionId` is `localStorage`-scoped per browser, so two tabs of the same browser
  are the same student)
