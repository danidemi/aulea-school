# Material catalog

Registry of every kind of didactic material can be produced. 
Every authoring subagent — see each row's `owning_subagent` for its exact name — and the
`material-author` orchestrating skill read this file instead of re-deriving the
mapping. 

Trigger values (`delivery_style`, `item_type`, `support_material_kind`) are the enums defined in
`reference/curriculum.schema.json`. Read that schema, do not guess at its enum values.

# Materials

## Material 1

```
type: slides
audience: Students and Trainer
preferred_formats: YAML deck model (`reference/deck_model_spec.md`); a human renders an approved model to PowerPoint/PDF separately, via `aulea-tools/slides/slides`
owning_subagent: author-slide
trigger: One per session, learner-facing content only, used by trainer
path_pattern: `material/slides/`
filename_pattern: `session-NN.yml`
```

## Material 2

```
type: student book
audience: Student
preferred_formats: AsciiDoc
owning_subagent: student-book-author
trigger: One per session, covering only that session's lecture, demo, and group_discussion items — never hands_on, project, or any of the four *_assessment_quiz items, which stay in their own student-facing files. Learner-facing only: no node_ref, no confidence tags, no reference to CURRICULUM/DESIGN or to any trainer-only material.
path_pattern: `material/student/books/`
filename_pattern: `session-NN-student-book.adoc`
```

## Material 3

```
type: quiz
audience: Student
preferred_formats: QTI 3.0 content package — a qti-assessment-test XML referencing one qti-assessment-item XML per question by relative href (a test cannot embed item bodies inline, per the QTI 3.0 binding spec), plus an imsmanifest.xml. Answer keys live inside each item file; a QTI-compatible delivery app is responsible for withholding them from the student-facing render.
owning_subagent: quiz-author
trigger: One per CURRICULUM item whose didactic_activity is prerequisite_assessment_quiz, feedback_assessment_quiz, learning_assessment_quiz, or summative_assessment_quiz. The item's node_ref may be a single node, an array of nodes (e.g. a prerequisite check spanning every Baseline a unit assumes), or omitted (a summative/capstone scoped to the whole course).
path_pattern: `material/teacher/quizzes/quiz-<kind>-session-NN-<sequence>/`
filename_pattern: `imsmanifest.xml`, `test.xml`, and `items/item-<NN>.xml` (one per question) inside that directory
```

## Material 4

```
type: demo guide
audience: Trainer
preferred_formats: AsciiDoc
owning_subagent: demo-author
trigger: One per CURRICULUM item with didactic_activity demo — a trainer-only, step-by-step script for a live demonstration, precise enough that a command-shaped step can be copy-pasted, plus a companion notes file holding the reasoning a trainer does not need mid-class
path_pattern: `material/teacher/demos/`
filename_pattern: `session-NN-<node_ref>-demo-guide.adoc` (the clean trainer script) and `session-NN-<node_ref>-demo-guide-notes.adoc` (instructional decisions, timing math, provenance reasoning)
```

`node_ref` in a filename is the item's own `node_ref`.

