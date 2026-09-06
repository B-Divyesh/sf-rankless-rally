# Review a 90-second routing puzzle

## Verdict

**PASS — 0 findings and 0 untested public claims.**

- Live URL: `https://rankless-rally.sociobot.in`
- Implementation candidate reviewed: `6ea1f1ee8c91e0882216af7fa855c01e132901f3`
- Documentation revision reviewed: `58e741a71146e7b19a6b611fef6537b4d2526027`
- Finding count: 0
- Untested claim count: 0

The live `/health` response identifies build `6ea1f1ee8c91e0882216af7fa855c01e132901f3`. The changes from that implementation candidate through the documentation revision are only `README.md`, `.factory/handoff.md`, `.factory/review-1.md`, and `.factory/verification-5.md`; the live implementation is therefore the reviewed candidate.

## First screen before scrolling

- Job: **Connect every relay before time ends.**
- Audience: **Puzzle players who want a personal route score, not a rank table.**
- First action: **Try it with sample data**. It loads a practice board with a shared route and does not change the real game.

Fresh desktop (1440×900) and phone (390×664) browser contexts showed the playable board before scrolling. The board began at 377.73 CSS pixels on desktop and 509.94 CSS pixels on phone. The first screen also states: Free to play, No account required, and Saves in this browser.

## Game, demo, and recovery

The fresh phone run used touch direction buttons. It entered `/demo`, showed the persistent **Demo — sample data, nothing is saved to your real game** label, Practice 01, a populated sample card (`74s`, `92%`, `2` rescues), and a loaded shared route. Reset restored the sample label and data. A real paused run at Relay `1/3` remained available after leaving demo.

The phone run completed `RRRRRURUUUUU` and reached **You reached the exit** with a populated rally card (`89s`, `100%`, `0` rescues). The server issued an opaque replay code. A separate fresh desktop context loaded it and showed **Shared route loaded** with no account. **Play this board again** reset to `1:30`, Relay `0/3`, and Rescue `0/3`. The restarted phone run reached the real end screen **The route was not completed** through the supported end-run path.

The recording is `/work/.evidence/rankless-rally-review-2/video/3b84ea285a84785204cd395a5fa6a0c8.webm`. End-screen evidence is `screenshots/phone-win.png` and `screenshots/phone-loss.png` in the same evidence directory.

Normal, invalid, boundary, and recovery paths passed in the live 52-check browser run: blocked movement, malformed and unknown replay codes, incomplete and post-win replay submissions, pause/refresh recovery, settings persistence, daily date change, archive selection, and reduced-motion replay completion. Keyboard Arrow keys and WASD, touch controls, settings, assist mode, mute, and Reduce movement all passed.

## Claims and clean setup

From this clean checkout, `npm ci` completed with 0 audit vulnerabilities. `npm run build` passed and produced `dist/`; JavaScript is 30.88 KB (10.82 KB gzip) and CSS is 16.10 KB (4.32 KB gzip). `cargo test` passed 6 tests. `npm test` passed 52 browser checks and 6 Rust tests in 44.0 seconds.

All 22 exact commands declared in `.factory/claims.json` passed independently. The inventory has 22 unique IDs, each with exactly one matching `@claim:` test tag.

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

The landing page, game, settings, Privacy, Terms, README, demo guide, and copy audit were cross-checked against the inventory. No additional public claim lacks a declared test.

## Live browser, backend, and performance checks

`PLAYWRIGHT_BASE_URL=https://rankless-rally.sociobot.in npx playwright test` passed all 52 checks in fresh desktop and phone projects in 1.2 minutes. The live public verifier passed health, completed and incomplete replay handling, independent replay reading, demo/public tenant isolation, and the 300-request allowance followed by `429` with `Retry-After: 60`.

`GET /health` returned `200`, `status: ok`, `database: ready`, and the implementation build. For a fresh persistence check, a completed public replay was created, only `sf-rankless-rally--repair4focus` was restarted, and a new product replica began at `2026-09-06T06:23:58Z`. After it was running, the pre-restart replay returned `200` with a byte-for-byte identical body and the same build. This verifies durable product state across a product replica restart.

A fresh phone measurement counted 121 animation frames in 2010.5 ms: **60.18 fps**. The active run also reported **60 Hz update sample**, satisfying the fixed-60 Hz claim. Assist mode began new runs at `2:15`. The daily board and all 20 permanent practice boards were playable; no other modes are advertised.

## Accessibility, privacy, routes, and links

- `scripts/verify-url.sh` passed on `/`, `/demo`, `/privacy`, `/terms`, and `/not-a-route`.
- Full Axe checks found 0 violations in light and dark treatments.
- The first Tab reaches **Skip to game**. Enter moves focus to `#game-title`. Route changes move focus to their page heading. Settings retains and returns focus correctly, including delayed demo hydration.
- Reduced-motion behavior, 200% text size, visible focus, keyboard controls, and phone touch target checks passed. The 200% phone check had no horizontal overflow.
- The gameplay request log contained only same-origin requests. No external script, font, analytics, ad, or tracking request appeared.
- `/`, `/demo`, `/privacy`, and `/terms` each returned 200 with one `h1`, one `main`, `lang="en"`, a route-specific title, description, and canonical. `robots.txt` and `sitemap.xml` returned 200. All ordinary internal links returned 200.
- `/not-a-route` deliberately returned the designed HTTP 404 with a working **Play a board** link. This expected response is not a finding.
- Privacy and Terms are available. Privacy accurately describes local browser state, demo separation, replay data, 24-hour demo expiry, no profile or account, and the request-address rate limit.
- Offline reload and update behavior are not promised, and no service worker is registered.

## Earlier finding disposition

| Earlier finding | Current disposition |
| --- | --- |
| RRV1 sample action did not load a shared route | Fixed and reconfirmed with populated sample card and loaded route. |
| RRV1 Archive link did not open its section | Fixed; live browser check confirms URL, visible heading, and focus. |
| RRV1 route and dialog focus loss | Fixed; live focus checks pass, including delayed demo hydration. |
| RRV1 phone targets under 44 pixels | Fixed; touch-target checks pass. |
| RRV1 invalid demo-banner ARIA role | Fixed; full Axe is clear. |
| RRV1 non-home canonicals used the home URL | Fixed; every public route has its own canonical. |
| RRV1 unknown route returned HTTP 200 | Fixed; the designed route now returns HTTP 404. |
| RRV1 undeclared daily, card, replay, audio, and motion behavior | Fixed; all 22 declared claim tests pass independently. |
| RRV1/RRV2 server-authoritative replay was absent | Fixed; live server accepts only completed routes and uses opaque replay codes. |
| RRV2 Archive navigation overshot its heading | Fixed; live archive focus and viewport test passes. |
| RRV3 storage wording and missing storage claim | Fixed; public copy and the SQLite metadata/expiry claim agree. |
| RRV3/RRV4 public replay routes returned static 404/405 | Fixed; live health, writes, reads, isolation, rate limit, and restart persistence pass. |
| Repair-4 demo hydration could replace Settings focus | Fixed; the live delayed-hydration focus test passes. |

## Evidence

Evidence is in `/work/.evidence/rankless-rally-review-2/`: `live-manual.json`, `live-playwright.log`, `npm-test.log`, `claims/`, `public-verifier.log`, `live-audit.json`, persistence before/after/settled JSON, screenshots, and the recorded phone run.
