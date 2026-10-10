# Building the prerequisite graph with LLM help

## The problem
Building the topic dependency graph is hard when the subject isn't one you know deeply — you can't easily judge which topic requires which.

## Where an LLM helps
An LLM has absorbed how many textbooks and courses order the same material, so it can:
- draft a candidate topic list
- propose prerequisite edges ("does A require B?") with a stated reason
- flag which of its own judgments feel uncertain

## The right way to use it
Treat every LLM-proposed edge as a **hypothesis, not a fact** — especially for topics you don't know well, since that's exactly when you can't catch it being wrong.

This mirrors actual research practice (the ACE method, an academic approach to building Educational Knowledge Graphs): don't try to fully automate the graph. Score candidate edges by confidence, then focus human review only on the uncertain ones.

Two cheap mitigations:
1. **Anchor edges to external structure.** Ask the LLM to justify a claim by referencing how a standard textbook or established curriculum orders the material. Textbook tables of contents are themselves expert-vetted topological sorts.
2. **Cross-check against real syllabi.** If multiple independent sources agree on an order, that's real evidence — not just the LLM being internally consistent with itself.

## Tools
- **`networkx` (Python):** cycle detection (`simple_cycles`), topological sort (`topological_generations`) — fits your existing stack.
- **draw.io / yEd:** no-code DAG layout, visually surfaces cycles.
- **CmapTools:** academic tool for manually refining concept-dependency maps.
- **Consumer AI curriculum tools** (e.g. ClickUp Brain): built for department-level program mapping across many courses — heavier than needed for a single course's topic graph.

## Practical workflow
LLM drafts the edge list with justifications → spot-check the weakest topics against 2–3 external sources → `networkx` catches cycles and produces the sort.
