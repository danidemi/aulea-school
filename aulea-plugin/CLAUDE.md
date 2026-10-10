# CLAUDE.md

## What this folder is

1. **A Claude Code plugin** for planning adult courses and producing their didactic material (slides, quizzes, exercises, manuals).

## Pipeline and how to invoke it

Phases (`.claude/reference/phases.md`): requirements gathering → curriculum design → instructional
design → materials development. Phase 3 has **no owner**; phase 4 covers slides plus the wider
material catalog below (teacher/student books, quizzes, demo scripts, hands-on guides, project
work, rubrics, reading guides).

- `/learning-requirements-gatherer` — **must be run by the human in the main conversation loop.** It
  interviews the human and writes LOGISTICS, GOALS, STUDENT_PERSONAS, EDITORIAL_GUIDELINES.
- `learning-curriculum-architect` — a subagent; `learning-project-manager` delegates to it with the
  Agent tool once the three requirement stores exist and are signed off. Writes DESIGN.
- `learning-curriculum-sequencer` — a subagent; delegated to once DESIGN is signed off. Writes
  CURRICULUM (`design/curriculum.json`), organizing the DESIGN graph into delivery sessions.
- The slide pipeline (see below) turns approved CURRICULUM items into per-session slide decks.
- `/learning-material-author` — a main-loop skill (its sign-off gate needs conversation). Fans out
  the 8 material-authoring subagents (teacher/student book, quiz, demo script, hands-on guide,
  project work, rubric, reading guide) per CURRICULUM item, collects drafts, and runs the human
  sign-off loop. Registry of which type applies to which item:
  `.claude/reference/material_catalog.md`. Shared authoring rules:
  `design/material_authoring_rules.md`.
- `learning-support-agent-coherence` — run this skill after editing **any** file under
  `.claude/agents/` or `.claude/skills/`. It audits name/path/ownership drift, reports first, and only
  edits after explicit human approval.

Because phase 3 has no owner, the phase-4 authoring roles necessarily make some
instructional-design decisions. Each records them in an `instructional_decisions` list tagged
`awaiting: instructional-designer` rather than burying them in the material's wording — that list
is the handover when a phase-3 owner exists.

## The rule that shapes the whole design: skill vs. subagent

A subagent receives one prompt and returns one final message — it has **no channel to ask the human
anything mid-run**. Therefore:

- Anything **interactive** must be a **skill running in the main loop** (hence requirements gathering
  is a skill, not an agent, and neither the orchestrator nor any subagent can run it — they must stop
  and ask the human to invoke it).
- Only **non-interactive design decisions** become subagents.

Preserve this split when adding roles. Delegation is blocking; independent subagent calls go in one
message to run in parallel, dependent ones are chained.

## Single Source of Truth

One authoritative store per domain, **exactly one writer**, everyone else reads the *current* version
before generating — retrieval before generation, never memory or invention. `.claude/reference/ssot_structure.md`


Stores hold **hypotheses as well as facts** — the prerequisite graph and the personas are informed
guesses. Every entry carries a confidence/provenance tag (`[stated]`, `[inferred]`,
`[invented framing]`, `[risk]`); low-confidence entries route to human review, and downstream work on a
still-provisional store is blocked pending sign-off.


## The knowledge graph editor (`tools/graph/`)

The repo's other toolchain — a browser app for viewing, editing, and certifying the DESIGN store
(`design/knowledge_goals_graph.json`). Also fully containerised.

```bash
tools/graph/graph edit  design/knowledge_goals_graph.json   # opens a browser, view/edit/save
tools/graph/graph check design/knowledge_goals_graph.json   # schema + closure check, headless
```

- **The JSON file is the source; the canvas layout is not** — positions are re-computed with
  Dagre on every load and never persisted, so they can't pollute a diff. Model reference:
  `.claude/reference/knowledge_goals_graph_model.md`; shape authority:
  `.claude/reference/knowledge_goals_graph.schema.json`.
- **A git commit of the JSON file is the certification** — unlike the slide pipeline there's no
  `status: approved` flag; the store is plain text, one writer, human-reviewed via the normal git
  diff.
- **Nothing hand-computes what `check.mjs` computes.** Schema validation and the closure check
  (every node needs a path down to a `Baseline`, unless it's marked `root: true`) run there; do
  not eyeball a graph for either and report it as checked.
- `tools/graph/README.md` covers running it in detail; `doc/tmp/app-editing-chart/plan.md` is the
  build log for how this toolchain came to exist, including the bugs found along the way.







## Editing rules for agents and skills

To ensure maximum accessibility for non-native English speakers and international audiences, strictly follow these writing guidelines when asked to create, edit, review skills and agents:

1. **Avoid Idioms and Metaphors:** Do not use idiomatic expressions, regional slang, or figurative phrases (e.g., avoid "touch base," "get your feet wet," "hit the ground running," or "running to land").
2. **Use Literal & Direct Terms:** State concepts using clear, precise, and literal language. Choose the most direct verb or phrase to describe an action or state.
3. **Prefer Plain Language:** Use widely recognized standard vocabulary. Avoid rare, obscure, or overly complex prose when simple, standard English conveys the same meaning.
4. **Maintain Clarity Over Rhetoric:** Prioritize scannability, clarity, and ease of translation over clever phrasing or literary flair.

#### Examples:
* **Avoid:** "This concept needs to be seen running to land."
  **Use:** "Students need to see this system execute live to fully understand it."
* **Avoid:** "Before we jump into the weeds, let's touch base on the setup."
  **Use:** "Before we discuss the detailed steps, let's review the required setup."
* **Avoid:** "This feature is currently on the back burner."
  **Use:** "This feature is currently deprioritized."
  