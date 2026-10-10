# ADR-0012: Icon library for `client/`

## Status
Accepted — 2026-09-20

## Context
QUIZ-TAKE-URL-LINK-001 needs an "open in new tab" icon next to the Quiz Session Monitor's
take-URL link. Grooming (2026-09-19) assumed `lucide-react` was already available transitively
via shadcn/ui (ADR-0006). That assumption was wrong: ADR-0006's shadcn/ui components are copied
directly into `client/src/components/ui/` (`button.tsx`, `card.tsx`, `input.tsx`, `label.tsx`)
rather than pulled in as a package, and none of them import any icon — `lucide-react` was not a
dependency at all, direct or transitive, and no icon of any kind exists in `client/` yet.

## Decision
Add **`lucide-react`** as a runtime dependency of `client/`, to be used for icons project-wide
going forward, not just for this one story.

* It's the icon set shadcn/ui's own docs and examples pair with by convention, so component
  styling stays consistent with ADR-0006's choice even though it isn't bundled with it.
* Tree-shakeable (each icon is its own module import), so pulling in one icon (`ExternalLink`)
  doesn't bloat the bundle with the full set.
* No native/node-gyp dependency, consistent with this project's existing preference (ADR-0004,
  ADR-0008) for keeping the dependency tree build-portable.

## Consequences
* `client/package.json` gains `lucide-react` as a runtime dependency.
* Future stories needing an icon should import from `lucide-react` rather than hand-writing SVG
  or introducing a different icon package.
