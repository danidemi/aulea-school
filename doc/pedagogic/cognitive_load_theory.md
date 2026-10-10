# Cognitive Load Theory: Core Principles for Instructional Design

Cognitive Load Theory (CLT), developed by John Sweller, starts from a simple constraint: working memory — where new information is actively processed — can hold only a handful of elements at once. Instruction that ignores this constraint overwhelms learners regardless of how good the content is. CLT identifies three types of load that compete for this limited capacity.

## 1. Intrinsic Load

The load inherent to the material itself, driven by its complexity and the number of interacting elements a learner must hold in mind simultaneously. Learning a single new function name is low intrinsic load; understanding a distributed system where five components affect each other simultaneously is high intrinsic load.

Intrinsic load cannot be removed — the topic is as complex as it is — but it **can be managed** by controlling *how much of it is faced at once*.

## 2. Extraneous Load

The load created by *how* material is presented, not by the material itself. It is "wasted" mental effort spent on poor design rather than on learning. Common sources: cluttered slides, split attention between disconnected text and diagrams, unnecessary decorative content, or explanations that force learners to search for relevant information.

Extraneous load is the main target for improvement — it can and should be reduced without touching the actual difficulty of the subject.

## 3. Germane Load

The load devoted to actually building understanding: forming schemas, connecting new information to prior knowledge, recognizing patterns. Unlike extraneous load, germane load is productive — it *is* learning. Good instructional design minimizes extraneous load to free up capacity for germane load.

---

## Key Design Principles Derived from CLT

| Principle | What It Means | Practical Response |
|---|---|---|
| **Worked examples first** | Learners with low prior knowledge learn better from studying a fully solved example than from solving it themselves | Show a complete solved case before asking for independent practice |
| **Split-attention effect** | Learning suffers when related information is physically or temporally separated (e.g., text below a diagram it explains) | Integrate labels directly into diagrams; keep explanation next to what it explains |
| **Redundancy effect** | Presenting the same information in two overlapping forms (e.g., narrating text that's also on screen word-for-word) increases load, not understanding | Don't duplicate information across channels; make each channel add something new |
| **Segmenting / chunking** | Complex material is easier to process in small, meaningful units with pauses for consolidation | Break long procedures into steps with checkpoints, not one continuous block |
| **Scaffolding & fading** | Support should be high when intrinsic load is high (new topic) and reduced as competence grows | Start with guided practice, gradually shift to independent problem-solving |
| **Element interactivity** | When elements *must* be understood together (they interact and can't be learned in isolation), load rises sharply | Introduce highly interactive content in isolation first, then combine gradually |
| **Modality effect** | Combining spoken explanation with visual material uses two separate channels of working memory, effectively increasing capacity | Pair diagrams with narration rather than diagrams with on-screen text |

## Implications for Teaching Technical Subjects

Technical topics (programming, architecture, systems) tend to have naturally high intrinsic load: syntax, logic, and abstract structure often must be held in mind simultaneously. This makes extraneous load reduction especially important — every bit of unnecessary complexity in *how* something is taught competes directly with capacity needed for the subject's own inherent difficulty.

A common mistake is introducing new syntax and a new concept at the same time. Better sequencing: fix one variable, vary the other — use **already-familiar syntax** to teach a **new concept**, or apply an **already-understood concept** to **new syntax**.

## One-Line Summary

Working memory is the bottleneck of learning: reduce load from poor presentation, manage load from the subject's inherent complexity through sequencing and scaffolding, and protect the mental capacity that's left for the load that actually builds understanding.
