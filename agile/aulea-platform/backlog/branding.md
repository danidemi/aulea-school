ID: BRANDING-001

Status: READY

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
