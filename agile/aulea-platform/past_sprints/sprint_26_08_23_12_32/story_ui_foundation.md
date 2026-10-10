ID: UI-FOUNDATION-001

As:
any user of the platform (`unregistered` or `registered`)

I want to:
see a visually polished, consistent interface instead of today's low-quality, ad-hoc styling

So that:
the product feels trustworthy and professional, and every new screen starts from a shared
visual foundation

Definition of Done:
* `shadcn/ui` adopted as the UI component library (ADR-0006) — copy-in components
  (Radix + Tailwind), not a runtime dependency
* existing screens (Home, Sign-up, Confirm-result, AUTH-UX-001's) rebuilt on it consistently:
  one spacing scale, one color palette, one type scale, defined
  button/input/link states (default/hover/focus/disabled)
* verified by human visual sign-off against that checklist

Implemented (sprint, 2026-08-22):
* Tailwind CSS 3 + Radix primitives, copy-in components under `client/src/components/ui/`
* tokens: spacing (`field-gap`/`group-gap`/`section-gap`), color (`ink`/`paper`/`brass`/
  `success`/`error`/`border`), type scale + 3 named font faces (`font-mono` defined but not
  yet used on any screen)
* signature element: auth-form cards styled as a library/course-catalog index card (brass
  spine + folded corner) rather than a generic centered box
* 39/39 server tests (unchanged), 23/23 client tests, same assertions surviving the markup
  rewrite (confirms behavior unchanged)
* gap, left open: no actual screenshot/visual review was possible (no browser/Playwright/
  Puppeteer available in that environment) — verified structurally only (compiled CSS has the
  expected classes, pages serve 200); human visual sign-off against the checklist was still
  needed at review time
