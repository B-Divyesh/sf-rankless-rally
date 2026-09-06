# Verify a 90-second routing puzzle and shared replay

## Verdict

**FAIL** — 1 high-severity finding remains. There are 0 untested public claims.

- Live URL: `https://rankless-rally.sociobot.in`
- Implementation candidate reviewed: `82f7dd0be762e44fd5ccbf731efef0cfca7d71d2`
- Documentation revision reviewed: `a88a925fb45457f54ebb115b6bbb857bb9fa4e9d`
- Finding count: 1
- Untested claim count: 0

The later documentation revision changes only `.factory/copy-audit.md` and `.factory/handoff.md`. The live HTML, JavaScript, and CSS match the clean candidate build exactly. The candidate replay server is not available through the public origin.

## First screen before scrolling

- Job: **Connect every relay before time ends.**
- Audience: puzzle players who want a personal route score, not a rank table.
- First action: **Try it with sample data.**
- Desktop: the game board starts at 96 CSS pixels in a 900-pixel viewport.
- Phone: the game board starts at 495.94 CSS pixels in an 844-pixel viewport.

Fresh desktop and phone contexts showed the job, audience, first action, three plain facts, and game board before scrolling. Evidence: `/work/.evidence/rankless-rally-verify-4/live-desktop-first-screen.png` and `live-phone-first-screen.png`.

## Finding

### RRV4-01 — High — The public origin does not serve the replay backend

The public frontend promises and calls a same-origin replay service, but the public origin serves static fallback responses instead.

- `GET /health` returned the designed HTML 404 instead of JSON health.
- `GET /api/replays/demo` returned the designed HTML 404.
- A valid completed replay `POST /api/replays` returned 405 instead of 201.
- An incomplete replay returned 405 instead of the documented 422 validation response.
- A 320-request allowance probe returned 320 HTTP 404 responses. No request returned 429 or `Retry-After`.
- The deterministic phone run reached **You reached the exit**, then showed **Your route is complete, but a replay code could not be saved**. No `RR2-…` code was issued, so an independent client could not open that run.
- `/demo` logs a 404 console error. The repository URL verifier fails on `/demo`, and Lighthouse reports the failed replay request.
- Live tenant isolation and restart persistence could not be exercised because the public service cannot create or resolve a replay record.

This makes the live `shared-replay`, `server-verified-replay`, and `completed-replay-only` claims false. It also makes the Privacy page’s server-check and storage description false for the current public deployment. Local server tests pass, so this is a deployment or public-routing defect rather than a candidate source defect.

Evidence: `/work/.evidence/rankless-rally-verify-4/health-headers.txt`, `demo-api-headers.txt`, `post-api-headers.txt`, `incomplete-api-headers.txt`, `rate-summary.log`, `live-browser.json`, `live-phone-win.png`, and `live-phone-run-win-loss.webm`.

## Game and demo results

- The one-click sample opened Practice 01 with the persistent demo label, a populated Sample best card (`74s`, `92%`, `2`), and a visible bundled shared-route marker.
- Reset restored the sample. A real run remained byte-for-byte unchanged after entering, resetting, and leaving the demo. Leaving removed all `demo:` browser-storage keys.
- Phone touch controls completed the deterministic route `RRRRRURUUUUU`. The win screen showed `87s`, `100%`, and `0` rescues.
- Restart restored `1:30`, `0/3` relays, and `0/3` rescues. The supported end-run path reached **The route was not completed**.
- A blocked move showed a useful recovery message. Invalid replay text showed the required format. Pause and reload restored a resumable run.
- Arrow keys and WASD passed in both declared browser projects. All four phone direction controls measured 44 by 44 CSS pixels.
- The phone rendered at 60.34 frames per second over two seconds. Its fixed update label reported `61 Hz update sample`.
- The independent replay step failed only because RRV4-01 prevented code creation.

The recorded entry, active play, win, restart, and loss run is `/work/.evidence/rankless-rally-verify-4/live-phone-run-win-loss.webm`.

## Claim commands

From the clean checkout at `a88a925`, `npm ci` completed with no audit vulnerabilities. `npm test` passed all 50 browser checks and all 6 Rust tests. Every exact command in `.factory/claims.json` then passed separately.

| Claim | Local command | Live disposition |
| --- | --- | --- |
| `complete-run` | PASS | PASS |
| `ninety-second-run` | PASS | PASS |
| `free-no-account` | PASS | PASS |
| `restart-reset` | PASS | PASS |
| `settings-persist` | PASS | PASS |
| `assist-extra-time` | PASS | PASS |
| `demo-isolation` | PASS | PASS |
| `keyboard-controls` | PASS | PASS |
| `touch-controls` | PASS | PASS |
| `pause-recovery` | PASS | PASS |
| `shared-replay` | PASS | **FAIL under RRV4-01** |
| `server-verified-replay` | PASS | **FAIL under RRV4-01** |
| `daily-and-archive` | PASS | PASS |
| `daily-board-changes` | PASS | PASS |
| `rally-card-values` | PASS | PASS |
| `replay-code-private` | PASS | The bundled sample is private; new live codes cannot be created under RRV4-01. |
| `server-storage-metadata` | PASS | Live storage cannot be reached under RRV4-01. |
| `completed-replay-only` | PASS | **FAIL under RRV4-01** |
| `route-sound-after-move` | PASS | PASS |
| `reduce-replay-motion` | PASS | PASS |
| `no-tracking` | PASS | PASS |
| `fixed-60hz` | PASS | PASS |

The landing page, game, settings, Privacy, Terms, README, demo guide, and copy audit were cross-checked against the 22-entry inventory. No additional unlisted or untested claim was found. Per-command logs are in `/work/.evidence/rankless-rally-verify-4/claims/`.

## Accessibility, privacy, routes, and performance

- Full Axe scans found zero violations in light and dark treatments.
- The first Tab reached **Skip to game**, and Enter focused `#game-title`. Privacy navigation focused its `h1`. Settings moved focus into the dialog and returned it to Settings when closed. Archive focus settled with its heading fully visible.
- Reduced-motion media changed player movement to `0.00001s`. At 200% root text size on a 390-pixel viewport, there was no horizontal overflow and the heading remained visible.
- All observed browser requests were same-origin. No external script, font, analytics, ad, or tracking request appeared.
- Privacy names browser data, demo separation, board ID, moves, opaque code, tenant, creation time, 24-hour demo expiry, and the one-minute request limit. The current server statements are false only because of RRV4-01.
- `/`, `/demo`, `/privacy`, and `/terms` returned 200 with distinct titles, one `h1`, matching canonicals, `lang="en"`, and one main landmark.
- `/not-a-route` correctly returned the designed HTTP 404 with a working return link. This expected 404 is not a defect.
- Every crawled internal link returned 200. The root, Privacy, Terms, and designed 404 passed `scripts/verify-url.sh`; `/demo` failed because its replay seed request logs the 404 from RRV4-01.
- Offline reload and update behavior are not promised. No service worker is registered.
- Lighthouse mobile on `/demo`: Performance 100, Accessibility 100, Best Practices 96, SEO 100; FCP 0.90 s, LCP 1.00 s, CLS 0, TBT 50 ms. Best Practices is reduced by the replay endpoint’s console error.
- Clean output: JavaScript 30.77 KB (10.78 KB gzip); CSS 16.10 KB (4.32 KB gzip).

## Live candidate comparison

| Artifact | Clean build SHA-256 | Live SHA-256 |
| --- | --- | --- |
| `index.html` | `c6b98dc3ae7ff75a82f22af2ad6b4ded0f7c397326bfbfd6650549780a1a8838` | same |
| Main JavaScript | `573dfc48e0909711617b8370ff63e84094d5634b33726a00e7d3442ed646a4a9` | same |
| Main CSS | `524bc103920e60e3b77d75df192c5ea8dd62455b6ef93001673f7aa97729c5a1` | same |

The live frontend matches implementation candidate `82f7dd0`. The public backend behavior does not: that candidate defines `/health` and replay routes, while the public origin returns static 404/405 responses.

## Earlier finding disposition

| Earlier finding | Current disposition |
| --- | --- |
| RRV1 sample action did not load a shared route | Fixed. The sample has a populated card and bundled shared marker. New server codes remain blocked by RRV4-01. |
| RRV1 Archive navigation did not open its section | Fixed. |
| RRV1 route and dialog focus loss | Fixed. |
| RRV1 phone targets under 44 pixels | Fixed. |
| RRV1 invalid demo-banner ARIA role | Fixed. Full Axe has zero violations. |
| RRV1 non-home canonicals used the home URL | Fixed. |
| RRV1 unknown route returned HTTP 200 | Fixed. The designed route returns HTTP 404. |
| RRV1 five public behaviors lacked claims | Fixed. All 22 declared commands work independently. |
| RRV1/RRV2 server-authoritative replay was absent | Implemented and passing locally, but unavailable live under RRV4-01. |
| RRV2 Archive navigation overshot its heading | Fixed. Desktop settled at 0.42 CSS pixels with focus on `archive-title`. |
| RRV3 public replay routes returned 404/405 | **Reopened as RRV4-01.** The same public failure is present now. |
| RRV3 storage wording omitted tenant, creation, expiry, and limits | Fixed in public copy and covered by `server-storage-metadata`. |

## Evidence

The complete evidence set is `/work/.evidence/rankless-rally-verify-4/`. Key files are `live-browser.json`, `live-phone-run-win-loss.webm`, `live-build-hashes.log`, `npm-test.log`, `claims-all.log`, `lighthouse-mobile.json`, `lighthouse-summary.json`, backend response headers, the 320-request rate summary, screenshots, and per-claim logs.
