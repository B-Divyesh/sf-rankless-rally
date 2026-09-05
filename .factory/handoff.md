# Rankless Rally handoff

## Release

- Implementation commit: `a233ee515b65265dcb9332d5911ab3741b915665`
- Verification documentation commit: `6a2f9c8ebf0aa563cb935451a26a16349e5127c6`.
- Deployment: static production artifact uploaded through `/opt/fleet/lib/deploy-static.sh rankless-rally dist`.
- Live URL: `https://rankless-rally.sociobot.in`

## What was delivered

Rankless Rally is a free 90-second routing puzzle for players who want to improve a personal score without a ranked ladder. It provides:

- a deterministic daily board and 20 permanent practice boards;
- keyboard (Arrow keys/WASD), pointer, and touch direction controls;
- a fixed-step 60 Hz loop, pause on hidden tab, recovery after refresh, local settings, mute, reduced movement, and assist time;
- a three-part rally card for speed left, elegance, and optional rescues;
- self-contained replay codes that load in another browser without an account;
- a `/demo` sandbox with separate `demo:rankless-rally:*` storage, a sample card, Reset demo, and Start for real;
- privacy and terms routes, a designed 404 page, metadata, sitemap, robots file, security headers, original SVG/CSS map art, and no external scripts or fonts.

The first desktop screen has the job, audience, first action, and live board in one view. The phone screen has the job, audience, and first action before a visible live board; the demo controls remain in a compact fixed bar.

## Verification completed

- `npm run build` passed. The output is `dist/`; main JS is 26,641 bytes (9.45 KB gzip) and CSS is 15,870 bytes (4.33 KB gzip).
- `npm test` passed: 30 Playwright checks across desktop Chromium and iPhone-sized Chromium.
- Every command in `.factory/claims.json` was run with its exact `npm test -- --grep @claim:<id>` form. All 14 claim commands passed in both browser projects.
- Playwright Axe integration reported no serious or critical WCAG 2 A/AA findings. The standalone Axe CLI was also attempted; it cannot launch the supplied ChromeDriver in this worker, so the installed Playwright Axe integration is the recorded accessibility result.
- `scripts/verify-url.sh` passed against local `/demo`, `/privacy`, and `/terms`: title, language, one main, one h1, image alternatives, and no console errors.
- Lighthouse mobile run against the deployed `/demo`: Performance 100, Accessibility 100, FCP 1.0 s, LCP 1.1 s, CLS 0.
- Fresh live desktop check: the root title, h1, audience sentence, sample action, and daily board were present without console errors. The board began at 378 px in a 900 px viewport.
- Fresh live phone check: title, h1, sample action, and a Practice 01 board beginning within the viewport were present without console errors.
- Live demo check: entered the sample, saw the persistent banner and sample rally card, reset it, then completed Practice 01 using the deterministic keyboard route to the real win screen.
- Live 404 browser check: `/not-a-route` rendered `Page not found — Rankless Rally` and `Choose a board that exists`.
- HTTPS root returned 200 with CSP, HSTS, `X-Content-Type-Options`, and Referrer-Policy headers.

## Earlier evidence and findings

The retry’s requested controller evidence file (`.factory/controller/rankless-rally-startup-failure.json`) and any previous handoff, design, implementation, review, or verification files were absent from the supplied repository. The only prior commit recorded the brief. The documented Azure pod startup failure was therefore treated as infrastructure-only and not as an assessment of game behavior.

The phone visual review initially placed decorative art ahead of the task and pushed the board down. The layout was corrected before release: desktop now puts the live board beside the task, and mobile removes the decoration, shows the task/audience/action first, then shows the board in the first viewport.

## Known gaps and next steps

- This static product has no backend, so replay codes are portable deterministic move logs rather than server-persisted rooms. The brief’s desired server-side anti-cheat verification remains an explicit backend dependency; the game does not claim it exists.
- Unknown URLs are served by the Static Web Apps SPA fallback with HTTP 200, then render the designed in-app 404 state after JavaScript starts. The browser path is complete; strict HTTP 404 semantics would require replacing the broad SPA fallback with explicit deployed route rewrites.
- There are no payment or AI features because neither is required for the free core game.
