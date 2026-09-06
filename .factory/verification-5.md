# Verify a 90-second routing puzzle and shared replays

## Verdict

**PASS** — 0 findings and 0 untested public claims.

- Live URL: `https://rankless-rally.sociobot.in`
- Implementation candidate reviewed: `6ea1f1ee8c91e0882216af7fa855c01e132901f3`
- Documentation revision reviewed: `7f88debcdc08ea0701c485c0d27d3be3d757f52b`
- Finding count: 0
- Untested claim count: 0

`/health` identifies the live build as the implementation candidate. The only changes from that candidate to the documentation revision are `README.md` and `.factory/handoff.md`. Clean-build HTML, JavaScript, and CSS hashes match the live files.

## First screen before scrolling

- Job: **Connect every relay before time ends.**
- Audience: puzzle players who want a personal route score, not a rank table.
- First action: **Try it with sample data.**
- Plain facts: **Free to play**, **No account required**, and **Saves in this browser**.
- Desktop: the board begins at 376.59 CSS pixels in a 720-pixel viewport.
- Phone: the board begins at 509.94 CSS pixels in a 664-pixel viewport.

Fresh desktop and phone contexts showed the game itself before scrolling. Evidence: `/work/.evidence/rankless-rally-verify-5/live-desktop-first-screen.png`, `live-phone-first-screen.png`, and `live-game-run.json`.

## Demo and complete game run

- One click opened `/demo` with the persistent **Demo — sample data, nothing is saved to your real game** banner.
- The populated sample showed Practice 01, shared route **loaded**, and a Sample best card of `74s`, `92%`, and `2` rescues.
- **Reset demo** restored the sample and kept the demo banner. A real run at Relay `1/3` remained byte-for-byte unchanged. **Start for real** removed every `demo:rankless-rally:*` key.
- Phone taps completed the deterministic route `RRRRRURUUUUU`. The end screen said **You reached the exit** and showed `89s`, `100%`, and `0` rescues.
- The server returned `RR2-9732S67TFYZH8K9B`. A separate fresh browser context loaded it, showed **Shared route loaded**, and showed no account.
- **Play this board again** restored `1:30`, Relay `0/3`, and Rescue `0/3`.
- Ending the restarted run reached **The route was not completed**. A separate real-time boundary run naturally reached `0:00` and **Time ended before the exit was reached** after 90 seconds.
- The phone rendered 120 frames in 2,000.5 ms, or 59.99 frames per second. The declared 60 Hz fixed-update check passed separately on live desktop and phone.

The required entry, active play, win, restart, and loss recording is `/work/.evidence/rankless-rally-verify-5/live-phone-entry-play-win-restart-loss.webm`. Named screenshots include `live-phone-demo-populated.png`, `live-phone-active-play.png`, `live-phone-win.png`, `live-independent-replay.png`, `live-phone-loss.png`, and `live-real-timeout-loss.png`.

## Claims and clean setup

The clean checkout was `7f88deb`. `npm ci` completed with 0 audit vulnerabilities. The first aggregate attempt found a product-owned local server left on port 4173 by the interrupted worker; it stopped before browser tests. After that stale process was removed, the unchanged documented command passed 52 browser tests and 6 Rust tests.

Every exact command in `.factory/claims.json` then passed independently:

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

The inventory has 22 unique IDs and exactly one matching `@claim:<id>` tag for each. The live landing page, game, Settings, Privacy, Terms, README, demo guide, and copy audit contain no additional missing or untested public claim. Per-command logs are under `/work/.evidence/rankless-rally-verify-5/claims/`.

## Live browser and recovery checks

- The complete live Playwright suite passed all 52 checks in fresh desktop and phone projects.
- Arrow keys, WASD, and phone taps worked. Every measured interactive target was at least 44 CSS pixels.
- Assist mode started a new run at `2:15`. Assist, mute, and reduced-movement settings survived reload.
- A blocked move gave a useful direction message. Invalid, incomplete, unknown-board, overlong, and post-win replay submissions were rejected.
- A simulated lost connection at replay-save time showed a specific retry action. Retrying after the connection returned produced a verified code.
- Pausing after a move and reloading restored a resumable run.
- Daily play, all 20 permanent practice boards, and the daily UTC change passed their declared checks. These are the only advertised modes.
- Route sound started only after a valid move. Reduced movement completed a shared replay without route animation.
- No payment, account, leaderboard, chat, or AI feature is advertised. The researched puzzle job does not imply an AI, import, or sync step.

## Backend checks

- `GET /health` returned HTTP 200 with build `6ea1f1e…` and `database: ready`.
- A completed route returned HTTP 201 and an opaque code. An incomplete route returned HTTP 422.
- Public and demo tenants could not read each other’s codes. An independent client could read the public code.
- The exact public checker admitted 6 validation calls plus 294 probes, then returned HTTP 429 with `Retry-After: 60` and the required security headers.
- One earlier boundary attempt began with one browser request still in the one-minute bucket and correctly limited one request sooner. After the bucket expired, the exact command passed from a clean minute.
- A replay was created before restarting only `sf-rankless-rally--repair4focus`. After the revision settled back to one running replica, that code still returned HTTP 200 with a byte-for-byte identical body. This proves live `/data` persistence across a product replica restart.

Evidence: `health.json`, `public-backend-rate-rerun.log`, `restart-persistence-settled-summary.json`, `revision-settled-after-restart.json`, and `replicas-settled-after-restart.json`.

## Accessibility, privacy, routes, and performance

- Full Axe scans found 0 violations in both light and dark treatments.
- The first Tab reached **Skip to game** and Enter focused `main`. Route navigation focused the new `h1`.
- Archive navigation settled with focus on `archive-title`; its top was `0.375px`, fully inside the viewport.
- Settings moved focus into the dialog and returned it to Settings, including while delayed demo hydration finished.
- Reduced-motion media set player movement to `0.00001s`. At 200% text size on a 390-pixel viewport, content had no horizontal overflow and the heading remained visible.
- All recorded gameplay requests were same-origin. No third-party script, font, analytics, ad, or tracking request appeared.
- Privacy explains browser state, demo separation, server fields, 24-hour demo expiry, removal, and the one-minute request limit. The server stores no account, name, profile, or browser settings.
- `/`, `/demo`, `/privacy`, and `/terms` returned 200 with distinct titles, one `h1`, one `main`, `lang="en"`, descriptions, social metadata, and matching canonicals.
- `/not-a-route` returned the designed HTTP 404 with a working route back. This deliberate 404 is expected, not a defect.
- Every crawled internal destination, `robots.txt`, `sitemap.xml`, social card, favicon, and touch icon returned the expected status.
- Offline reload and update behavior are not promised. No service worker is registered.
- Lighthouse mobile on `/demo`: Performance 100, Accessibility 100, Best Practices 100, SEO 100; FCP 1.22 s, LCP 1.28 s, CLS 0, TBT 31 ms.
- Clean output: JavaScript 30,884 bytes (10,779 gzip); CSS 16,103 bytes (4,326 gzip).

## Earlier finding disposition

| Earlier finding | Current disposition |
| --- | --- |
| RRV1 sample action did not load a shared route | Fixed. The sample has a populated card and a loaded shared route. |
| RRV1 Archive link did not open its section | Fixed. URL, final scroll position, and heading focus pass. |
| RRV1 route and dialog focus loss | Fixed, including delayed demo hydration. |
| RRV1 phone targets under 44 pixels | Fixed. The measured minimum is 44 pixels. |
| RRV1 invalid demo-banner ARIA role | Fixed. Full Axe has 0 violations. |
| RRV1 non-home canonicals used the home URL | Fixed. Every public route has its own canonical. |
| RRV1 unknown route returned HTTP 200 | Fixed. The designed route returns HTTP 404. |
| RRV1 undeclared daily, card, replay, audio, and motion behaviors | Fixed. The inventory has 22 independently passing claims. |
| RRV1/RRV2 server-authoritative replay was absent | Fixed. The live server rejects incomplete logs and issues codes only for completed routes. |
| RRV2 Archive navigation overshot its heading | Fixed. The settled heading top is `0.375px`. |
| RRV3 storage wording and missing storage claim | Fixed. Public copy and the SQLite metadata/expiry claim agree. |
| RRV3/RRV4 public replay routes returned static 404/405 responses | Fixed. Health, replay writes, reads, isolation, persistence, and rate limiting pass on the public origin. |
| Repair-4 demo hydration could replace Settings focus | Fixed. The delayed-response focus check passes live. |

## Evidence

The complete evidence set is `/work/.evidence/rankless-rally-verify-5/`. It includes clean install and test logs, every claim log, live Playwright traces/screenshots/videos, the named game recording, API and restart results, URL checks, Axe results, metadata and link checks, build hashes, and Lighthouse JSON.
