This file describe a list of files that represent the Single Source Of Truth (SSOT) for an adult class.

In this document `<ROOT>` is the folder of the project.

Listed Owners are the only skills and agents that are authorized to write that SSOT. All others are can read.

# Stores List

## Store 1

```
name: LOGISTICS
path: <ROOT>/specifications/logistics.md
holds: Describe all logistic aspects of the course. Cohort size and composition, total duration, delivery mode, language. Agents and skills do **not** chunk the course with it but they use it to size the design and the curriculum.
owners: skill 'requirements-gatherer'
```

## Store 2

```
name: STUDENT_PERSONAS
path: <ROOT>/specifications/student_personas.md
holds: Defines all students personas participating in the course. Defines the real learner context that makes the curriculum more than a topic list — prior experience (baseline), problem triggers (framing), autonomy, and **who each node is for**: the personas are the source of the persona ids that are used across the design phase. 
owners: skill 'requirements-gatherer'
```

## Store 3

```
name: GOALS
path: <ROOT>/specifications/goals.md
holds: "Clearly states the course goals. The final curriculum maps over these. Readers do not add, remove, or reword them."
owners: skill 'requirements-gatherer'
```

## Store 4

```
name: DESIGN
path: <ROOT>/design/knowledge_goals_graph.json
holds: A graph representing what knowledge are needed to obtain other knowledge that in the end allow the student to obtain the course goals. Info contained: persona id list, `Baseline`/`DesiredResult`/`Prerequisite` nodes, `Requires` edges, deliberate roots, depth staging. Shape fixed by `<ROOT>/.claude/reference/knowledge_goals_graph.schema.json`. Downstream roles read it to know *what* must be taught and *what depends on what*.
owners: `curriculum-architect`
```

## Store 5

```
name: CURRICULUM
path: `<ROOT>/design/curriculum.json`
holds: The course curriculum — how the DESIGN graph is organized for delivery (sessions, ordered items, delivery style/pattern, assessments, support material). Shape fixed by `<ROOT>/.claude/reference/curriculum.schema.json`.
owners: agent `curriculum-sequencer`
```

## Store 6

```
name: EDITORIAL_GUIDELINES
path: `<ROOT>/specifications/editorial_guidelines.md`
holds: Instructional language, tone/register, terminology consistency rules, idiom/metaphor policy, visual template/branding pointers, accessibility notes.
owners: `requirements-gatherer`
```

# Notes on stores 

* Not all stores exists before hand. 
* Is the owner skill/agent goal to produce the store. 
* See `reference/material_catalog.md` for the full type-to-trigger-to-path registry,
and `material_authoring_rules.md` for the rules every authoring subagent follows.


