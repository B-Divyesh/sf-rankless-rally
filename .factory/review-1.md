# Review: Play a 90-second routing puzzle

## Verdict

**PASS — 0 findings and 0 untested public claims.**

- Live URL: `https://rankless-rally.sociobot.in`
- Implementation candidate reviewed: `6ea1f1ee8c91e0882216af7fa855c01e132901f3`
- Documentation revision reviewed: `95e9d9da9e518ec2f717c8a06341578f1269e1f3`
- Finding count: 0
- Untested claim count: 0

`GET /health` returned HTTP 200 with build `6ea1f1ee8c91e0882216af7fa855c01e132901f3` and `database: ready`. The documentation revision changes only `README.md`, `.factory/handoff.md`, and the preceding verification report after the implementation candidate.

## First screen

Before scrolling, fresh desktop and phone browser contexts showed:

- Job: **Connect every relay before time ends.**
- Audience: puzzle players who want a personal route score, not a rank table.
- First action: **Try it with sample data.**
- Plain facts: **Free to play**, **No account required**, and **Saves in this browser**.

Both contexts began at scroll position 0 with no console errors. The board begins at 376.59 CSS pixels in the 1280×720 desktop viewport and 509.94 CSS pixels in the 390×664 phone viewport. The first screen therefore includes the game itself rather than a menu wall. Evidence: `/work/.evidence/rankless-rally-review-1/first-screen.json`, `review-desktop-first-screen-final.png`, and `review-phone-first-screen-final.png`.

## Game, demo, and recovery

- The one-click sample action opened `/demo` with the persistent **Demo — sample data, nothing is saved to your real game** banner.
- The populated sample showed Practice 01, a loaded shared route, and a Sample best rally card of `74s`, `92%`, and `2` rescues.
- Reset demo restored the sample and left a separate real run at Relay `1/3` intact. Returning to the real game showed that run and **Resume run**.
- A fresh phone run used the deterministic route `RRRRRURUUUUU`, reached **You reached the exit**, showed a three-part card, and received an opaque `RR2-…` code.
- **Play this board again** reset the timer to `1:30` and relays to `0/3`. The restarted run then reached the supported **The route was not completed** loss screen.
- The live desktop and phone suite also completed the independent-client shared replay, invalid replay input, blocked movement, pause/reload recovery, settings persistence, assist time, sound-after-move, reduced replay movement, daily board, archive, and 20 practice boards.

The phone run record is `/work/.evidence/rankless-rally-review-1/review-phone-run.json`; its screenshots are `review-phone-demo.png`, `review-phone-win.png`, and `review-phone-loss.png`. The live phone win/restart/loss recording is `/work/.evidence/rankless-rally-review-1/live-playwright/claims-plays-a-complete-wi-3982d-s-the-supported-loss-screen-phone/video.webm`.

## Claims and clean setup

`npm ci` completed with 0 audit vulnerabilities. `npm test` passed 52 browser tests and 6 Rust tests. `npm run build` produced `dist/`, with 30.88 KB JavaScript (10.82 KB gzip) and 16.10 KB CSS (4.32 KB gzip).

Every exact command declared in `.factory/claims.json` passed independently from the clean checkout:

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
| `server-verified-replay` | PASS |
| `daily-and-archive` | PASS |
| `daily-board-changes` | PASS |
| `rally-card-values` | PASS |
| `replay-code-private` | PASS |
| `server-storage-metadata` | PASS |
| `completed-replay-only` | PASS |
| `route-sound-after-move` | PASS |
| `reduce-replay-motion` | PASS |
| `no-tracking` | PASS |
| `fixed-60hz` | PASS |

There are 22 unique claim IDs and exactly one matching test tag per claim. The landing page, game, settings, Privacy, Terms, README, demo guide, and copy audit contain no extra unlisted public claim. Per-command logs are in `/work/.evidence/rankless-rally-review-1/claims/`.

## Live browser, privacy, routes, and accessibility

- The complete live Playwright suite passed all 52 desktop and phone checks. Its captured traces, screenshots, and videos are in `/work/.evidence/rankless-rally-review-1/live-playwright/`.
- `scripts/verify-url.sh` passed for `/`, `/demo`, `/privacy`, `/terms`, and `/not-a-route`. The latter returned the designed HTTP 404 with a working return path; that deliberate status is expected.
- Full Axe scans passed with no violations in the dark treatment and no serious or critical violations in the standard treatment. Keyboard navigation, skip link, route focus, dialog focus return, 44-pixel controls, 200% text scaling, and reduced movement are covered by the live suite.
- The no-tracking claim passed on the live origin. No third-party request, font, script, analytics, ad, or account/payment flow was observed.
- Route titles, descriptions, canonical links, `lang`, one `h1`, and one `main` passed. `robots.txt`, `sitemap.xml`, favicon, 180×180 SVG apple-touch icon, and social card returned successfully.
- Offline reload and update behavior are not promised; no service worker is registered.

The internal-link crawl found only 200 destinations, apart from the expected `/not-a-route#main` self-link on the deliberate 404 page. Evidence: `link-crawl.json`, `health.json`, and `health.headers` in the review evidence directory.

## Backend

The documented public verifier passed after a clean one-minute rate-limit window:

- health returned HTTP 200 and the candidate build;
- the demo and public replay tenants could not read each other’s records;
- an incomplete route returned HTTP 422;
- a completed route returned HTTP 201 and an opaque code;
- a separate client read the public code successfully;
- 300 requests were allowed before HTTP 429, which included `Retry-After: 60`, `X-Content-Type-Options: nosniff`, and `Referrer-Policy: strict-origin-when-cross-origin`.

The first boundary attempt immediately after earlier browser checks reached the limit seven requests early because the public proxy grouped those requests in the same one-minute bucket. After expiry, the unchanged documented command passed exactly. This is expected rate-limit recovery, not a product defect. Evidence: `/work/.evidence/rankless-rally-review-1/public-rate.log`.

## Earlier finding disposition

| Earlier finding | Current disposition |
| --- | --- |
| RRV1 sample replay, Archive navigation, route/dialog focus, phone targets, ARIA, canonicals, and 404 status | Fixed and passing live. |
| RRV1 missing claim coverage for daily, card, replay, audio, and motion behavior | Fixed: all 22 declared claims pass independently. |
| RRV1/RRV2 missing server-authoritative replay verification | Fixed: live server rejects incomplete routes and verifies completed routes. |
| RRV2 Archive settled position | Fixed: live suite confirms the focused archive heading remains visible. |
| RRV3 storage wording and storage-claim gap | Fixed: current copy agrees with the SQLite metadata/expiry claim. |
| RRV3/RRV4 live replay API 404/405 | Fixed: health, writes, reads, tenant isolation, and rate limiting pass on the public origin. |
| Repair-4 delayed demo hydration replacing Settings focus | Fixed: live delayed-hydration focus regression passes. |

## Evidence

All review evidence is under `/work/.evidence/rankless-rally-review-1/`. No product code changed during this review.
