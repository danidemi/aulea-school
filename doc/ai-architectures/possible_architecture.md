# Multi-Agent System for Adult Training Content Creation

## Purpose

This document describes the design of an AI-assisted multi-agent system for creating classes and related materials (slides, quizzes, exercises, manuals) for adult audiences. It covers the agents involved, the reusable skills they draw on, the supporting tools they depend on, and the alignment mechanism that keeps them all working from the same facts.

---

## 1. Agents

Each agent owns a *decision*, not just a task — the reasoning involved is what makes it an agent rather than a fixed script.

### Needs Assessment Agent
Gathers real learner context (roles, goals, existing skill level) before any design work starts. Adult learners become motivated when content maps onto a need they already recognize as theirs — this input can't be guessed by a model; it has to be collected from the actual cohort.

### Curriculum Architect Agent
Turns raw topics into a prerequisite graph: proposes dependencies ("A must be understood before B"), runs a topological sort, clusters circular dependencies instead of forcing a fake order, and sequences the result around a real problem the learner cares about — not around which topic has the most downstream dependents.

### Instructional Designer Agent
Decides *how* each module will teach, not just *what*: how much content to expose at once (managing cognitive load), and where each topic sits in the experience → reflection → theory → practice cycle.

### Content Author Agent
Writes the actual slide text, manual sections, and worked examples, applying load-management rules directly — no duplicate information across channels, a worked example before independent practice.

### Assessment Designer Agent
Builds quizzes and exercises. Chooses whether each check is formative (feedback learners can still act on) or summative (a final measure), mixes question formats, and maps every item back to a specific learning objective.

### Editor Agent
Enforces consistency *across* all modules: shared terminology, consistent acronym expansion on first use, tone, formatting, and brand/template compliance. Separate from the Content Author because self-editing catches less than a review from a different role.

### Proof-Reader Agent (learner simulator)
Simulates a specific learner persona reading the material end-to-end and reports where that persona would get confused, bored, or overloaded — including taking the quiz "cold." This checks the experience *from the inside*, as opposed to checking compliance with rules from the outside. Personas should come from real cohort data (via the Needs Assessment Agent) rather than being invented, since persona simulation is itself a hypothesis about learner reaction, not a fact.

### Pedagogy Reviewer Agent (critic)
Cross-checks every other agent's output against instructional-design rules: does the module open with a clear "why"? Does the quiz mirror the formative practice learners already saw? Is a prerequisite edge still just an unverified hypothesis? Flags uncertain items for human review instead of silently accepting them.

### Packaging Agent
Converts finished content into the format the target delivery platform needs (exam format, interactive slide format, activity-tracking format).

### Orchestrator Agent
Runs the pipeline order and decides when to pause for a human checkpoint — for example, low-confidence graph edges, a flagged load-management violation, or final sign-off before packaging.

**Suggested pipeline order:**
Needs Assessment → Curriculum Architect → Instructional Designer → Content Author → Assessment Designer → **Editor** (style/consistency pass) → **Proof-Reader** (persona simulation) → Pedagogy Reviewer (rule compliance) → human checkpoint → Packaging.

Editor before Proof-Reader is deliberate: simulating a learner reading a draft still full of typos and inconsistent terms produces noise, not useful signal.

---

## 2. Skills

Reusable capabilities that agents call on — the "how," decoupled from the "who decides."

- **Prerequisite Graph Builder** — proposes dependency edges with a stated justification, tags each with a confidence level, runs cycle detection and topological sorting.
- **Needs-Assessment Survey Generator** — drafts short surveys or interview prompts to extract real goals and baseline knowledge from a specific cohort.
- **Quiz Item Generator** — produces items across multiple formats, checks distractor quality, tags each item to a cognitive level (recall, application, analysis).
- **Cognitive Load Checker** — scans a draft slide or manual section for clutter, split attention between text and diagram, or redundant narration/text overlap.
- **Andragogy Relevance Checker** — verifies a module states its practical "why" upfront, frames content as a problem to solve, and leaves the learner some choice in pacing or path.
- **Standards Exporter** — packages output into whatever interoperability format the destination learning platform expects (assessment format, interactive content format, activity-tracking format, metadata format).
- **Common-Error Gallery Builder** — aggregates recurring wrong answers across a cohort into new formative teaching material.
- **Document/Slide Formatter** — produces the actual document/slide files with consistent branding applied.

---

## 3. Supporting Tools

Infrastructure the agents and skills rely on, but which isn't itself an agent.

- **Learner profile store** — holds each cohort's needs-assessment results for reuse across modules and future courses.
- **Graph repository + visualizer** — stores the topic dependency graph and renders it visually so a human can actually see and approve uncertain edges, not just read a list.
- **Human review dashboard** — a single place surfacing everything flagged for review: low-confidence graph edges, pedagogy violations, pending approvals.
- **Version-controlled content repository** — stores content sources with history, enabling diffing and rollback across course revisions.
- **Delivery-platform connector** — pushes packaged output to the actual learning platform used for delivery.
- **Analytics/feedback loop** — collects real quiz performance after a course runs and feeds it back into the Assessment Designer and the Common-Error Gallery Builder, so the course improves between cohorts instead of staying static.
- **Brand/template library** — centralizes fonts, colors, and logo rules so every generated document looks consistent.

---

## 4. Single Source of Truth (SSOT) — Keeping Agents Aligned

### The problem it solves
Without a shared authoritative reference, different agents can each invent their own version of learning objectives, terminology, or the topic sequence — and quietly drift apart from each other over the course of a project.

### The approach
Not one giant document — one **authoritative store per domain**, each with exactly one agent allowed to write it. Every other agent reads it, or proposes a change to it, but never keeps a private copy of its own.

| Store | Owner (writer) | Everyone else |
|---|---|---|
| Prerequisite graph | Curriculum Architect | Reads it to sequence content; can flag an edge as wrong, can't silently overwrite it |
| Learning objectives map | Curriculum Architect | Assessment Designer must trace every quiz item to an objective already in this map |
| Learner persona/profile store | Needs Assessment Agent | Proof-Reader Agent simulates only personas that exist here — no inventing convenient personas |
| Terminology/style glossary | Editor Agent | Content Author and Assessment Designer reuse the same term and acronym expansion, not their own phrasing |
| Course manifest (structure, sequencing, module IDs) | Orchestrator Agent | Packaging Agent reads this to know what maps to what — no reinterpretation at packaging time |

### Why it matters especially here
Two of these stores hold **hypotheses, not facts**: the prerequisite graph (an LLM's guess at topic dependencies) and the personas (a guess at how a real learner reacts). The SSOT approach makes this distinction explicit and enforceable — every entry carries a confidence/provenance tag, and low-confidence entries route automatically to the human review dashboard instead of slipping through unreviewed.

### Where it should NOT be applied
Generative content itself — the actual wording of slides, exercises, explanations — should stay outside SSOT control. Locking that centrally would defeat the purpose of having a Content Author agent produce varied, natural material. SSOT is for *structural* truth (what must be taught, in what order, using what terms), not for the creative expression of it.

### Practical implementation
Each store is a versioned artifact that every agent must read the current version of before proceeding — retrieval before generation, not memory or invention. The Orchestrator should refuse to let an agent proceed if it hasn't consulted the current version of a store it depends on.

**Risk to manage:** if human review of a store (e.g., the prerequisite graph) lags behind, downstream agents may keep building on a stale or still-unapproved version. The Orchestrator should block progression past a "provisional" (unapproved) version of a store until it is explicitly marked approved.

---

## One-Line Summary

A pipeline of agents — each owning one design decision, each grounded in a shared, versioned, confidence-tagged source of truth rather than private assumptions — turns adult-learning theory into consistent, reviewable course material, with human checkpoints exactly where the system is working from a hypothesis rather than a fact.