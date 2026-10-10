# Reusable Class-Generation Agents: Design Notes

## Problem

One set of agents/skills, used across many course "projects" (quizzes, slides, exams), without content bleeding between projects.

## Isolation = the folder

The agent only ever sees the folder connected to a session. So a project is simply one folder. Isolation is automatic, not something the agent has to enforce itself.

## Manifest = project identity

Each project folder holds a `PROJECT.md` file: subject, level, language, style notes, output paths. Every skill reads this file first. If it's missing, the skill refuses to guess and asks to initialize the project instead. This is what lets a generic skill behave correctly per project.

## Skills = shared logic, folder = shared state

Skills (quiz generator, slide generator, branding) stay identical across projects. What varies is data: source material, style, history — all stored inside the project folder (`materiale/`, `output/`, `memory.md`). Global preferences (how Daniele likes things done in general) live separately from project-specific memory (what this cohort already saw).

## Agent orchestration

An orchestrator agent can call specialist sub-agents (quiz-generator, slide-generator, etc.). Calls are blocking: the caller waits and receives one final result, not a live stream.

- Independent sub-tasks → call all sub-agents together in one message, they run in parallel.
- Dependent sub-tasks → call one, wait for its result, feed that into the next.

There is no "fire and forget" — every call, even resuming an earlier agent, blocks until that agent completes.

## Summary

| Concept | Role |
|---|---|
| Folder | Project boundary, enforces isolation |
| PROJECT.md | Project identity and rules, read before any generation |
| memory.md | Project-specific history |
| Skill | Reusable generation logic, same across projects |
| Orchestrator agent | Routes work, combines results, respects output paths |
| Sub-agent call | Blocking; parallel for independent work, sequential for dependent work |
