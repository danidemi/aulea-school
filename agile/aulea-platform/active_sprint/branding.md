ID: BRANDING-001

Status: IN_REVIEW

Priority: Normal

Effort: 5

As:
a `trainer` (or any visitor of the website)

I want to:
see the Aulea.school identity everywhere the site presents itself: the `App Header`, the browser tab title and the browser/OS icons

So that:
I can immediately recognize the website and the product has a proper identity instead of the generic "Learning Platform".

Merges the former `WEBSITE-NAME` and `FAVICONS` PBIs (same assets, same screens).

Assets (source of truth for the look):
* [logo.png](assets/BRANDING-001/logo.png) — the icon: navy rounded square, teal border, teal prompt `>_`, amber star
* [title.png](assets/BRANDING-001/title.png) — the `Wordmark` "Aulea" (navy) + ".school" (teal), and the `Tagline` "AI AUTHORING FOR HUMAN TEACHERS" (grey, uppercase, letter-spaced)

Decisions (confirmed by the Product Owner, 2026-10-14):
* the `App Header` shows the icon plus the `Wordmark`, no `Tagline`
* the `Tagline` is shown only on the login page and the home page
* the browser `<title>` is in scope
* favicons: all the formats needed, traced from `logo.png` where a vector is required

Confirmed by the Product Owner (2026-10-14):
* the `Wordmark` is real HTML text, not the PNG, so it stays sharp, selectable and themeable. Font: a geometric sans close to the one in `title.png`, self-hosted (no external font CDN). "Aulea" uses the brand navy in light mode and the normal ink color in dark mode, because navy is unreadable on a dark background. ".school" stays teal in both modes.
* the icon is an inline/static SVG traced from `logo.png`; the same SVG is the favicon source.
* `<title>`: `Aulea.school` on every page, no per-page suffix for now.

Definition of Done:
* the `App Header` no longer contains the text "Learning Platform"; it shows the icon and the `Wordmark` ("Aulea" + ".school", two colors) in the top left corner, and the whole block links to the home page
* the login page and the home page show the `Tagline` under the `Wordmark`; no other page shows it
* the home page intro text in `App.tsx` ("The Learning Platform helps trainers ...") uses the name "Aulea.school" instead
* `client/index.html` `<title>` is `Aulea.school`
* the following files exist in `client/public/` and are linked from `index.html`: `favicon.ico` (16, 32, 48 px), `icon.svg`, `apple-touch-icon.png` (180 px), `icon-192.png`, `icon-512.png`, `icon-512-maskable.png`, and a `site.webmanifest` that names the product and lists the 192/512 icons. The `theme-color` meta uses the brand navy.
* a unit test (given / when / then) checks that the `App Header` renders the `Wordmark` and no longer renders "Learning Platform", and that the `Tagline` appears on login and home only
* the `Wordmark` stays readable in light and dark color-scheme and at a narrow (mobile) viewport
* an e2e (Playwright) check asserts the `<title>`, the favicon `<link>` tags and that each linked icon URL answers 200 with the right content type
* existing unit and e2e suites stay green
* evidence attached under `assets/BRANDING-001/`: Playwright screenshots of the header on the login page and on a signed-in page, each in light and dark mode and at mobile width, plus a screenshot of the browser tab/favicon at 16 px and 32 px
* the other places where the old name still appears (server emails, `README.md`, Docker labels) are searched with grep; the result is written in the PBI, and any hit that is out of scope becomes its own PBI

Out of scope:
* Open Graph / social-share image
* renaming the repository, package names or the `aulea-platform` folder

Implementation plan (sprint planning, 2026-10-16):
* New ADR-0015 (Proposed): Outfit, self-hosted with `@fontsource-variable/outfit`.
* Findings that shaped the plan:
  * The `App Header` is dark navy (`bg-ink`, `#1E2A44`). A navy "Aulea" is invisible on it.
  * The PBI puts the `Tagline` "under the `Wordmark`" on login and home, but the header has no `Tagline`.
  * The app has no dark theme (color scheme pinned to light in `index.css`).
* Decisions taken to resolve them (Product Owner to redirect if wrong):
  * `Wordmark` component with two color variants: on a dark surface (the header) "Aulea" is `paper`
    and ".school" is brand teal; on a light surface "Aulea" is brand navy and ".school" is teal.
  * New `BrandBlock` component (`Wordmark`, large, on light surface + `Tagline`) rendered in the page
    body of the login page and the home page. The header stays compact: icon + `Wordmark`, no `Tagline`.
  * Brand teal is sampled from `logo.png`; if it is under 4.5:1 on `#1E2A44`, a lighter teal is used on
    the dark surface only.
  * "Readable in dark color-scheme" is verified with emulated `prefers-color-scheme: dark`. A real dark
    theme is out of scope; it would be a separate PBI.
* Files: `client/src/components/AppHeader.tsx`, new `Wordmark.tsx`, `BrandBlock.tsx`, `BrandIcon.tsx`
  (inline SVG), `App.tsx` (intro text + `BrandBlock`), `LoginPage.tsx` (`BrandBlock`), `index.html`
  (title, icon links, `theme-color`, manifest), `tailwind.config.js` (`fontFamily.wordmark`, `teal` token).
* Icons: no vector tool is installed. `icon.svg` is hand-built from the `logo.png` shapes (rounded
  square, teal border, `>_`, amber star) and compared with the PNG by rendering it in Playwright.
  A script `client/scripts/build-icons.ts` renders the PNGs (180/192/512/maskable) with Playwright and
  packs `favicon.ico` (16/32/48, PNG payloads). No new dependency.
* Tests: `AppHeader`/`App`/`LoginPage` unit tests (given / when / then); update `App.test.tsx` line 36
  (it looks for the link named "Learning Platform"). New e2e spec for `<title>`, favicon links and
  200 + content type for each icon.
* Old-name grep (DoD): `Learning Platform` hits today are `client/index.html`, `App.tsx`,
  `App.test.tsx`, `AppHeader.tsx`. Server emails, `README.md` and Docker labels still to be searched
  and written here during the sprint. The server DB name `learning_platform` in compose files is
  out of scope (renaming it breaks existing databases).
* Evidence: screenshots as listed in the DoD, taken during development (Playwright).

Implemented (2026-10-16):
* `AppHeader` shows `BrandIcon` (inline SVG) + `Wordmark` (`on-dark`: "Aulea" paper, ".school" teal), linking home (`aria-label="Aulea.school"`). `BrandBlock` (large `Wordmark` `on-light` + `Tagline`) is rendered on `LoginPage` and on `App` (home, signed-out only). `App.tsx` intro text now says "Aulea.school helps trainers ...". `index.html`: title `Aulea.school`, icon/manifest links, `theme-color` `#1E2A44`.
* Font: Outfit via `@fontsource-variable/outfit` (ADR-0015, still Proposed, PO to confirm). Tailwind: `fontFamily.wordmark`, `teal` (`#12A58B`, sampled from the PNGs; 4.61:1 on the navy header), `teal-700` (`#087A63`, 4.76:1 on paper, used on light surfaces), `tagline` (`#5F6879`, 5.06:1 on paper).
* Icons in `client/public/`: `icon.svg` (hand-built from `logo.png`, compared by eye in a render), `favicon.ico` (16/32/48), `apple-touch-icon.png` (180), `icon-192.png`, `icon-512.png`, `icon-512-maskable.png`, `site.webmanifest`. Generated by `npm run build:icons` (`client/scripts/build-icons.ts`, Playwright, no new dependency). The apple-touch and maskable icons are full-bleed navy with the glyph in the safe zone.
* Tests: new `Wordmark.test.tsx`, `AppHeader.test.tsx`; `App.test.tsx` and `LoginPage.test.tsx` updated (name, tagline in the body and not in the header). New `e2e/branding.spec.ts`: title, `theme-color`, icon `<link>`s, each icon and the manifest icons answer 200 with the right content type, tagline on `/` and `/login` only, no horizontal overflow at 375 px. `e2e/helpers.ts` brand-link selector updated.
* Verification: vitest 120/120, `tsc -b` clean, Playwright 7/7 in `branding.spec.ts` and the signup specs green against the built server on port 3100.
* Evidence (real Chromium), in `assets/BRANDING-001/`: `login-{light,dark}-{desktop,mobile}.png`, `courses-{light,dark}-{desktop,mobile}.png` (signed-in page), `favicon-16-32.png` (the 16/32 frames of the served `favicon.ico` in a tab-like strip; not a real browser tab). "Dark" is emulated `prefers-color-scheme: dark`; the app has no dark theme, so dark equals light.
* Old-name grep (`learning[ _-]?platform`, case-insensitive, whole `aulea-platform/` minus `node_modules`/`dist`): no user-facing hit is left (no server email text, README or Docker label used the old name). Remaining hits are internal and out of scope: `LEARNING_PLATFORM_ROOT` constants in `client/vite.config.ts` and `server/src/version.ts`, and the DB user/name `learning_platform` in `server/docker-compose.yml`. No new PBI needed.
* UX pattern check: the header is shared by every page (`AppHeader`), so all screens get the Wordmark; the Tagline is deliberately limited to login and home.
* Added `Brand Block` to `references/ubiquitous_language.md`.
* do_and_donts applied: screenshots from real Chromium attached; built app run on its own port; tools checked live (Docker, Playwright); no manual `db:migrate`; visual check done in dark/mobile, not just DOM assertions.
* Open: ADR-0015 font choice needs PO confirmation; the icon SVG is a hand-traced approximation (compare `public/icon-512.png` with `logo.png`).
