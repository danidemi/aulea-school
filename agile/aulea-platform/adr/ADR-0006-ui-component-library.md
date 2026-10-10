# ADR-0006: UI component library for `client/`

## Status
Accepted — 2026-08-22

## Context
UI-FOUNDATION-001 exists because Home, Sign-up, and Confirm-result were built
functionality-first with no shared visual language — every screen invents its own spacing,
colors, and control styles. ADR-0001 fixed React + TypeScript + Vite for `client/` but never
picked a component library; this is the first story that needs one.

Three candidates were considered at sprint planning (2026-08-22): shadcn/ui, MUI, Mantine.

## Decision
Use **shadcn/ui** (Radix primitives + Tailwind CSS), over MUI and Mantine.

* shadcn/ui components are copied into the repo (`client/src/components/ui/`), not pulled in
  as a versioned runtime dependency — no library upgrade cadence to track, and every
  component can be edited directly when the design needs something the library doesn't
  offer out of the box.
* Full styling control fits a product that wants a distinctive look, rather than inheriting
  MUI's recognizable Material Design appearance or committing to Mantine's own theming
  system.
* Cost: no built-in theming engine — the consistency checklist (spacing scale, color
  palette, type scale, component states) defined in `backlog/story_ui_foundation.md` has to
  be maintained by convention (Tailwind config + component code), not enforced by a
  framework.

## Consequences
* `client/` gains Tailwind CSS and Radix UI primitives as dependencies, plus the copied-in
  shadcn/ui component source.
* UI-FOUNDATION-001 rebuilds Home, Sign-up, Confirm-result, and whatever AUTH-UX-001 has
  shipped by the time it's picked up, on top of these components — sequenced after
  AUTH-UX-001, per that story's Notes.
* Every screen built after UI-FOUNDATION-001 reuses these components rather than styling
  itself independently (per CLAUDE.md's Sprint Planning activity, this is a tech-stack
  addition made explicit here rather than discovered ad hoc mid-implementation).
