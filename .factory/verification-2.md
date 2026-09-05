# Verify a 90-second routing puzzle without a ranked ladder

## Verdict

**FAIL** — 2 findings remain. There are no untested public claims.

- Live URL: `https://rankless-rally.sociobot.in`
- Runtime implementation reviewed: `d15b43bd58af170d659b6c3e97863f96fa81062e`
- Documentation revision reviewed: `fb3cf529464b5b0ffb07013cc20229a11e652a79`
- Finding count: 2
- Untested claim count: 0

The later commits `ddd4a1e` and `fb3cf52` only change `.factory/handoff.md`. The deployed HTML, JavaScript, and CSS exactly match a clean build from the implementation candidate.

## First screen before scrolling

- Job: **Connect every relay before time ends.**
- Audience: puzzle players who want a personal route score, not a rank table.
- First action: **Try it with sample data.**
- Desktop: the board starts at 96 CSS pixels in a 900-pixel viewport.
- Phone: the board starts at 495.94 CSS pixels in an 844-pixel viewport.

Fresh desktop and phone contexts showed the job, audience, first action, three plain facts, and the game itself before scrolling. Evidence: `/work/.evidence/rankless-rally-verify-2/live-desktop-first-screen.png` and `/work/.evidence/rankless-rally-verify-2/live-phone-first-screen.png`.

## Findings

### RRV2-01 — Medium — Archive navigation settles past its heading

The Archive link changes the address to `/?archive=1` and focuses `#archive-title`, but the smooth scroll continues after focus. Once the page settles, the focused heading is outside the viewport. On desktop its top is `-208.58px`; on phone it is `-82.81px`. The desktop view begins with practice buttons 11–20, followed by the replay section, so the archive title and its first ten boards are above the visible area.

This reopens RRV1-02. The repair test checks while smooth scrolling is in progress and can pass when the heading briefly crosses the viewport. It does not wait for the final scroll position. Evidence: `/work/.evidence/rankless-rally-verify-2/live-archive-settled.json`, `live-desktop-archive-settled.png`, and `live-phone-archive-settled.png`.

### RRV2-02 — Medium — Replay verification is not server-authoritative

Replay validation runs only in the browser. The repository and deployment have no product backend or SQLite state, so a server does not verify deterministic move logs. The product does not falsely present browser validation as server authority, but the researched brief makes server-side anti-cheat a constraint. This remains the previously disclosed scope gap.

A product-owned backend with SQLite on `/data` is required to clear this finding. Backend tenant isolation, restart persistence, health, and `429`/`Retry-After` checks could not apply because no backend exists.

## Game and demo results

- The one-click sample opened Practice 01 with the persistent demo label, a populated card (`74s`, `92%`, `2`), and a visible loaded shared route.
- Reset restored the sample card and route. A real run with Relay 1 connected remained unchanged after entering, resetting, and leaving the demo.
- Phone touch controls completed `RRRRRURUUUUU`. The win screen said **You reached the exit** and showed `89s`, `100%`, and `0` rescues.
- Restart restored `1:30`, `0/3` relays, and `0/3` rescues.
- Ending a run through pause and confirmation showed **The route was not completed**. Advancing the live timer through 90 seconds also produced the loss screen.
- A second independent browser loaded and played the completed replay. Invalid text and a correctly formatted incomplete route were rejected.
- Arrow keys and WASD connected Relay 1. Blocked movement, pause, refresh recovery, settings persistence, and assist time all worked.
- The live update sample measured `61 Hz` on desktop and `60 Hz` on phone.

The recorded phone run is `/work/.evidence/rankless-rally-verify-2/live-phone-run-win-loss.webm`. Win, loss, timeout, demo, and replay screenshots are in the same evidence directory.

## Claim commands

From the clean checkout at `fb3cf52`, `npm ci` completed with no audit vulnerabilities. `npm test` passed all 46 checks. Every exact command in `.factory/claims.json` then passed separately in both browser projects.

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
| `daily-board-changes` | PASS |
| `rally-card-values` | PASS |
| `replay-code-private` | PASS |
| `completed-replay-only` | PASS |
| `route-sound-after-move` | PASS |
| `reduce-replay-motion` | PASS |
| `no-tracking` | PASS |
| `fixed-60hz` | PASS |

The landing page, settings, legal pages, and README were cross-checked against the inventory. No missing, false, incomplete, or untested public claim was found. Per-command logs are under `/work/.evidence/rankless-rally-verify-2/claims/`.

## Accessibility, privacy, routes, and performance

- Live Axe found zero violations in light and dark treatments, including zero `aria-allowed-role` violations.
- Keyboard route focus and settings-dialog focus restoration worked after their request-animation-frame update. The skip link worked. The settled Archive focus remains RRV2-01.
- All checked live phone targets were at least 44 by 44 CSS pixels.
- Reduced motion changed player movement to `1e-05s`. At 200% text size and 390 CSS pixels, the heading, sample action, and controls remained visible without horizontal overflow.
- The sample flow made three requests, all to the product origin. No third-party request, tracking request, external script, or external font was observed.
- Privacy explains browser storage, replay contents, and removal through browser site-data controls. Terms states availability and the absence of accounts and payment.
- `/`, `/demo`, `/privacy`, and `/terms` returned 200 with distinct titles and matching canonicals. `/not-a-route` returned the designed page with HTTP 404 and a working way back.
- All crawled internal links returned 200. `robots.txt`, `sitemap.xml`, and the social card returned 200. Security responses included CSP, `X-Content-Type-Options`, and `Referrer-Policy`.
- Offline reload and update behavior are not promised. There is no service worker, so those are not untested claims.
- Lighthouse mobile on `/demo`: Performance 100, Accessibility 100, Best Practices 100, SEO 100, FCP 0.9 s, LCP 0.9 s, CLS 0, TBT 0 ms.
- Clean output: JavaScript 28.69 KB (10.07 KB gzip); CSS 16.16 KB (4.35 KB gzip).

## Live candidate comparison

| Artifact | Clean build SHA-256 | Live SHA-256 |
| --- | --- | --- |
| `index.html` | `b78bf15c61abd282281f50298ad42e37e42f5e9f0f610a98bd6dd018c1957bce` | same |
| Main JavaScript | `8365a9c7194bb93c7a8f834119a57a80c78dd98bf303c93fc2ef6a8bca33dd08` | same |
| Main CSS | `b0eacb8507b947cf76e7eb70e6032bfb065ce0e91d2c6ccbc565929cfaafe3db` | same |

## Earlier finding disposition

| Earlier finding | Current disposition |
| --- | --- |
| Sample promised a shared route but did not load one | Fixed. The sample includes a completed route and visible marker. |
| Archive changed the address without opening the archive | **Open as RRV2-01.** Address and focus now change, but the settled view overshoots the heading. |
| Route and dialog focus loss | Fixed, apart from the Archive scroll defect described separately. |
| Phone targets under 44 pixels | Fixed. All measured targets meet 44 by 44 CSS pixels. |
| Invalid demo-banner ARIA | Fixed. Full Axe reports no violations. |
| Home canonical on non-home routes | Fixed. All four public routes match their canonical. |
| Unknown route returned 200 | Fixed. The designed unknown route returns HTTP 404. |
| Five public behaviors lacked claims | Fixed. The inventory has 20 complete commands, all independently passing. |
| Server-side replay verification absent | **Open as RRV2-02.** No server authority or SQLite backend exists. |

## Evidence

The complete evidence set is `/work/.evidence/rankless-rally-verify-2/`. Key machine-readable files are `live-qa.json`, `live-archive-settled.json`, `live-boundary-recovery.json`, `live-fps.json`, `lighthouse-summary.json`, `live-build-hashes.log`, `verify-live.log`, `npm-test.log`, and `claims-summary.log`.
