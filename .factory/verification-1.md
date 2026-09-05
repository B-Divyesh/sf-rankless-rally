# Verify 90-second routing puzzles without a ranked ladder

## Verdict

**FAIL** — 9 findings remain, including 5 public claims without complete declared tests. The implementation is playable, but this review cannot declare PASS unless every finding and untested claim is cleared.

- Live URL: `https://rankless-rally.sociobot.in`
- Runtime implementation reviewed: `a233ee515b65265dcb9332d5911ab3741b915665`
- Documentation and claims revision reviewed: `9775839e2f5165673e2d6638135f4d43de771edb`
- Live/runtime comparison: the deployed HTML, JavaScript, and CSS hashes exactly match the clean build. The later revision changes tests and documentation, not runtime code.
- Finding count: 9
- Untested public claim count: 5

## First screen before scrolling

- Job: **Connect every relay before time ends.**
- Audience: puzzle players who want a personal route score, not a rank table.
- First action: **Try it with sample data.**
- Desktop: the live daily board begins at 378 CSS pixels in a 900-pixel viewport.
- Phone: the live daily board begins at 510 CSS pixels in an 844-pixel viewport.

Both fresh browsers showed the job, audience, first action, facts, and the game board before scrolling. Evidence: `/work/.evidence/rankless-rally-verify-1/live-desktop-first-screen.png` and `/work/.evidence/rankless-rally-verify-1/live-phone-first-screen.png`.

## Findings

### RRV1-01 — Medium — The sample action promises a shared route but does not load one

The first-screen action says, “Loads a practice board and a shared route.” A fresh click opens `/demo` with Practice 01 and a populated sample best card, but there is no “Shared route loaded” state and no shared route marker. The sample is useful, but the stated output is false. Either seed a real replay ghost or change the sentence.

### RRV1-02 — Medium — The Archive header link does not open the archive

The link changes the address to `/?archive=1`, but the app does not read that parameter. Scroll remains at 0, focus remains on the body, and the archive begins about 1,298 CSS pixels below the viewport. This is a failed navigation path.

### RRV1-03 — Medium — Client-side navigation and dialogs lose keyboard focus

After the Privacy client-side link is used, `document.activeElement` is `BODY`; the new `h1` has no `tabindex`, so the attempted `h1.focus()` has no effect. Closing Settings also rebuilds the page without returning focus to the Settings control. This does not meet the route-focus and dialog-focus requirements. The fresh-page skip link itself works and focuses `main`.

### RRV1-04 — Medium — Several phone touch targets are under 44 pixels high

At the iPhone 13 viewport, the wordmark is 30.4 CSS pixels high, the three header links are 21.6 pixels high, the privacy detail link is 19 pixels high, and footer Privacy/Terms links are 16 pixels high. Game direction controls meet 44 by 44 pixels, but the site-wide target requirement applies to every interactive element.

### RRV1-05 — Minor — The demo banner uses an invalid ARIA role

Full Axe and Lighthouse report `aria-allowed-role` for `<aside class="demo-banner" role="status">`; `status` is not allowed on that element. The WCAG A/AA-tagged Axe subset has no serious or critical issue, but the full accessibility scan has this minor finding. Lighthouse accessibility is 99 rather than the earlier reported 100.

### RRV1-06 — Minor — Non-home routes use the home canonical URL

`/demo`, `/privacy`, and `/terms` retain `https://rankless-rally.sociobot.in/` as their canonical URL. Lighthouse reports the Demo canonical as invalid because it points to the domain root instead of equivalent content. Each real route needs matching route metadata.

### RRV1-07 — Minor — Unknown routes render a 404 page with HTTP 200

`/not-a-route` renders the designed page, correct title, one `h1`, and a working return action, but its live response is HTTP 200. This confirms the earlier documented limitation. The deliberate unknown route should return HTTP 404.

### RRV1-08 — Medium — The claim inventory omits five public behaviors

All 14 declared commands pass, but the page also makes these public statements without a matching complete tagged claim test:

1. The daily board changes each day.
2. Rescues and fewer moves improve the relevant rally-card values.
3. A replay code contains only a board and moves, with no name or profile.
4. Route sounds begin only after the first move.
5. Reduce movement removes tile movement.

The existing archive test counts buttons and switches two boards; it does not test a date change. The settings test checks stored checkbox values, not audio or movement effects. The replay test loads a code, but does not assert its privacy payload. These five claims are counted as untested.

### RRV1-09 — Medium — The brief’s server-side move verification is absent

Replay codes are accepted and played entirely in the browser. There is no product backend to verify deterministic move logs. The README and earlier handoff disclose this honestly, but the researched brief lists server-side anti-cheat as a constraint. This remains an unresolved scope gap. Server room persistence was not tested because the live product does not advertise or provide server rooms.

## End-to-end game evidence

- One-click sample: `/demo` showed the persistent sample label, Practice 01, a 90-second timer, and a populated Sample best card with 74 seconds, 92% elegance, and 2 rescues.
- Reset: Reset demo restored the sample. A real run created in the same fresh temporary browser stayed at Relay 1, and Start for real removed all `demo:` keys.
- Win: the deterministic route `RRRRRURUUUUU` reached **You reached the exit** and produced a rally card with speed, elegance, and rescues. Evidence: `/work/.evidence/rankless-rally-verify-1/live-phone-win.png`.
- Loss: a run at the timer boundary reached **The route was not completed**, reported “Time ended before the exit was reached,” and reset to 1:30. Evidence: `/work/.evidence/rankless-rally-verify-1/live-phone-timeout-loss.png`.
- Independent replay: a second fresh browser loaded the completed code and displayed the shared route marker. Evidence: `/work/.evidence/rankless-rally-verify-1/live-independent-replay.png`.
- Invalid and recovery paths: blocked movement, invalid replay text, pause, refresh recovery, explicit end, restart, assist time, persisted settings, daily/practice switching, and browser back/forward all worked.
- Inputs: Arrow keys, WASD, desktop pointer clicks, and phone taps worked. Direction controls measured at least 44 by 44 CSS pixels.
- Runtime: after the initial partial sample, the live fixed-step display stabilized at 59–61 Hz on desktop and phone.

## Claims commands

The commands were run separately from clean checkout `9775839e2f5165673e2d6638135f4d43de771edb`. Each ran both desktop and phone projects.

| Claim | Result |
| --- | --- |
| `complete-run` | PASS |
| `ninety-second-run` | PASS |
| `free-no-account` | PASS |
| `restart-reset` | PASS |
| `settings-persist` | PASS |
| `assist-extra-time` | PASS |
| `demo-isolation` | PASS |
| `keyboard-controls` | PASS |
| `touch-controls` | PASS |
| `pause-recovery` | PASS |
| `shared-replay` | PASS |
| `daily-and-archive` | PASS |
| `no-tracking` | PASS |
| `fixed-60hz` | PASS |

`npm test` also passed all 30 Playwright checks. The five missing public claim tests in RRV1-08 are not part of those 14 commands.

## Accessibility, privacy, routes, and performance

- `scripts/verify-url.sh` passed on `/`, `/demo`, `/privacy`, `/terms`, and `/not-a-route` for title, language, one main, one `h1`, alt text, and console errors.
- WCAG A/AA-tagged Axe scans found no serious or critical violations in light or dark treatment. The full scan found RRV1-05.
- Reduced-motion media changed the player transition to `0.00001s`. A 200% text-size smoke check at 390 CSS pixels kept the heading, sample action, and direction controls visible with no horizontal overflow.
- No console or page errors occurred in fresh desktop or phone play.
- Live sample requests stayed on `https://rankless-rally.sociobot.in`; no third-party request was observed.
- Privacy and Terms have distinct titles, one `h1`, and readable removal and availability text.
- Offline use and an update flow are not promised, so they were not assessed as product claims.
- The product is static. Tenant isolation, service restart persistence, health, SQLite, and 429/Retry-After checks do not apply.
- Lighthouse mobile on `/demo`: Performance 100, Accessibility 99, Best Practices 100, SEO 92, FCP 0.9 s, LCP 0.9 s, CLS 0, TBT 0 ms. Raw report: `/work/.evidence/rankless-rally-verify-1/lighthouse-mobile.json`.
- Clean build output: 26.64 KB JavaScript (9.45 KB gzip) and 15.87 KB CSS (4.33 KB gzip).

## Live candidate comparison

| Artifact | Clean build SHA-256 | Live SHA-256 |
| --- | --- | --- |
| `index.html` | `7741f7065131105d6a76c6c45086b1d21a9b73bd010295751c445f611b5996ec` | same |
| Main JavaScript | `c10e6c13839f3cd0ee73849f774ee96a389fe0b00c9ee81519ba53f3fee134c1` | same |
| Main CSS | `7236c48b7e17610cf6d5d63a8c9e1a96a74704e02be0b5f1cd3158d1da9144a7` | same |

## Earlier finding disposition

- The earlier phone layout issue is resolved: job, audience, sample action, facts, and the game board are present in the first phone viewport.
- The final WASD and real phone-tap claim refinement is effective; both commands pass independently.
- The earlier startup-controller evidence file remains absent from repository history. The live deployment is healthy, so that infrastructure event is not a current product finding.
- The previously documented lack of server-side verification remains open as RRV1-09.
- The previously documented HTTP 200 fallback remains open as RRV1-07.

## Evidence files

- `/work/.evidence/rankless-rally-verify-1/live-desktop-first-screen.png`
- `/work/.evidence/rankless-rally-verify-1/live-phone-first-screen.png`
- `/work/.evidence/rankless-rally-verify-1/live-phone-demo.png`
- `/work/.evidence/rankless-rally-verify-1/live-phone-win.png`
- `/work/.evidence/rankless-rally-verify-1/live-phone-timeout-loss.png`
- `/work/.evidence/rankless-rally-verify-1/live-independent-replay.png`
- `/work/.evidence/rankless-rally-verify-1/live-phone-text-200.png`
- `/work/.evidence/rankless-rally-verify-1/lighthouse-mobile.json`
