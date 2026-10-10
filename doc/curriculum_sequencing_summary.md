# Sequencing a course as a dependency graph

## The core problem
Course topics form a graph, not a line: some topics depend on others, and dependencies can be tangled or even circular. Teaching requires a linear sequence. The task is turning the graph into a usable order — for adult learners, whose prior experience, motivation, and autonomy shape the sequence directly.

## Framework

**1. Fix the stopping point — per learner, not per group**
Decompose each topic backward into its prerequisites, stopping once a branch reaches assumed baseline knowledge. Adults arrive with uneven prior experience, so this baseline isn't uniform across the group. Use a quick diagnostic, or design the sequence to tolerate individual learners skipping nodes they already hold.

**2. Build the graph**
Nodes = topics. Edges = "A must be understood before B."

**3. Handle cycles**
If two topics depend on each other, don't force a fake order. Treat them as one cluster, introduce both shallowly together, then revisit each at greater depth later (spiral curriculum / depth staging).

**4. Order around problems, not concept centrality**
A topological sort gives a valid order, but many valid orders usually exist. For adult learners, prioritize problem-first sequencing over concept-first: open with a real, relevant task and pull in prerequisite topics just-in-time, as the problem demands them. The topological order still constrains what's possible — it defines which sequences are valid — but the order visible to the learner is organized around tasks they already care about, not around which topic has the most downstream dependents.

**5. Leave room for choice**
Once mandatory dependencies for a session are satisfied, offer remaining topics as an optional menu rather than a single imposed path. Adults engage better with visible structure plus some control over it.

**6. Chunk into sessions**
Group the ordered topics into teachable units, sequenced toward whatever is most directly applicable to the learners' actual professional context — concrete relevance, not a generic "early win."

Steps 3–4 typically need more than one pass — refine as the graph gets clearer.

## Can an LLM do the sequencing work?

- **Yes, for drafting:** given real information about the learners (roles, reasons for enrolling, goals), an LLM can draft problem scenarios, propose which topic to expose first, and write the framing that connects a topic to why it matters to that specific group.
- **No, for the underlying judgment:** an LLM has no access to what will actually feel urgent to a specific group of adults. That requires a needs assessment — a short survey or a few conversations — done beforehand. Without that input, the LLM defaults to generic, low-value relevance statements.

## Practical path forward
Graph construction and sorting (steps 2–4) can be automated with a script (e.g. Python + `networkx`: cycle detection, topological generations, centrality ranking as one input among several). An AI agent adds value at the edges — extracting prerequisite relationships from course material, drafting problem scenarios, and generating framing text — once fed real learner context from a needs assessment.
