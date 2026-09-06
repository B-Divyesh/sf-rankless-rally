# Verify short routing puzzles and shared replays

## Verdict

**FAIL** — 2 findings remain, including 1 public claim without a complete declared test.

- Live URL: `https://rankless-rally.sociobot.in`
- Implementation candidate reviewed: `64cc2c4ddea4f7a8ccbac4b441eb7cc8ba35d02c`
- Documentation revision reviewed: `e8d21d9266d7726cc11c5896d03756cdcda5b091`
- Finding count: 2
- Untested claim count: 1

The live HTML, JavaScript, and CSS exactly match the candidate frontend. The live origin does not serve the candidate replay backend: its health and replay paths resolve through the static 404/405 handler.

## First screen before scrolling

- Job: **Connect every relay before time ends.**
- Audience: puzzle players who want a personal route score, not a rank table.
- First action: **Try it with sample data.**
- Desktop: the board starts at 96 CSS pixels in a 900-pixel viewport.
- Phone: the board starts at 495.94 CSS pixels in an 844-pixel viewport.

Fresh desktop and phone contexts showed the job, audience, first action, three plain facts, and the game itself before scrolling. Evidence: `/work/.evidence/rankless-rally-verify-3/live-desktop-first-screen.png` and `live-phone-first-screen.png`.

## Findings

### RRV3-01 — High — The live replay backend is not available

The deployed frontend calls a same-origin replay service, but the live origin does not expose it.

- `GET /health` returned the designed HTML 404 instead of JSON health.
- `GET /api/replays/demo` returned the designed HTML 404.
- `POST /api/replays` returned 405 instead of validating the move log.
- A completed phone run reached the win screen, then showed **Your route is complete, but a replay code could not be saved**. No `RR2-…` code was issued, so an independent client could not open the completed run.
- A burst of 310 demo replay requests produced 310 responses with 404. No response returned 429 or `Retry-After`.
- Tenant isolation and restart persistence could not be exercised because the live service never created a replay record.
- `/demo` logs a 404 console error for its replay request. The repository’s URL verifier therefore fails on this route, and Lighthouse reports the same console error.

This breaks the declared `shared-replay` and `server-verified-replay` behaviors and the brief’s server-authoritative replay requirement. A deliberate unknown-page 404 remains correct; 404 responses on documented health and API routes are defects. Machine-readable evidence: `/work/.evidence/rankless-rally-verify-3/backend-live.json` and `live-qa.json`. The failed end state is visible in `live-phone-win.png` and `live-phone-win-loss.webm`.

### RRV3-02 — Medium — The server-storage privacy statement is incomplete and has no declared claim

The README says the server stores **only** the board, moves, code, and sandbox expiry. The public Privacy page lists the same data. The candidate SQLite schema also stores a tenant value and creation timestamp (`tenant`, `created_at`). Those fields are reasonable, but the word **only** makes the published statement inaccurate.

No entry in `.factory/claims.json` declares or directly tests the server record’s stored fields or demo retention. `replay-code-private` checks the opaque code and the absence of a displayed name/profile; it does not prove the server-storage statement. This is counted as one untested public claim.

## Game and demo results

- The one-click sample opened Practice 01 with the persistent demo label, a populated Sample best card (`74s`, `92%`, `2`), and the bundled shared-route marker.
- Reset restored the demo. A real run at Relay `1/3` remained unchanged after entering, resetting, and leaving the demo.
- Phone touch controls completed `RRRRRURUUUUU`. The win screen showed **You reached the exit**, `89s`, `100%`, and `0` rescues. Replay-code creation then failed as described in RRV3-01.
- Restart restored `1:30`, `0/3` relays, and `0/3` rescues.
- The supported end-run flow and the accelerated 90-second boundary both reached **The route was not completed**. Screenshots are `live-phone-loss.png` and `live-phone-timeout-loss.png`.
- Arrow keys and WASD connected Relay 1. Blocked movement, invalid replay text, pause/reload recovery, assist time, persisted settings, reduced movement, daily play, and all 20 practice boards passed locally. Invalid live replay text showed a useful error.
- A fresh phone sample measured 60.42 rendered frames per second over two seconds. Its fixed simulation label reported 62 Hz in that sample; a separate desktop sample reported 60 Hz.

The run recording is `/work/.evidence/rankless-rally-verify-3/live-phone-win-loss.webm`.

## Claim commands

From a fresh checkout at `e8d21d9`, `npm ci` completed with no audit vulnerabilities. `npm test` passed all 50 browser checks and all 5 Rust checks. Every exact command in `.factory/claims.json` then passed separately in both browser projects.

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
| `shared-replay` | PASS locally; false on live deployment |
| `server-verified-replay` | PASS locally; false on live deployment |
| `daily-and-archive` | PASS |
| `daily-board-changes` | PASS |
| `rally-card-values` | PASS |
| `replay-code-private` | PASS for its declared scope |
| `completed-replay-only` | PASS locally; live API returned 405 |
| `route-sound-after-move` | PASS |
| `reduce-replay-motion` | PASS |
| `no-tracking` | PASS |
| `fixed-60hz` | PASS |

Per-command logs are in `/work/.evidence/rankless-rally-verify-3/claims/`; the aggregate run is `npm-test.log`.

## Accessibility, privacy, routes, and performance

- Full Axe scans found zero violations in light and dark treatments.
- The skip link worked. Privacy route focus settled on its `h1`; Settings returned focus to its trigger.
- Archive focus settled on `#archive-title` with the entire heading visible: desktop top `0.42px`, phone top `0.19px`. This clears RRV2-01.
- Every measured visible phone control and link was at least 44 by 44 CSS pixels.
- Reduced-motion media changed player movement to `0.00001s`. At 200% root text size on a 390-pixel viewport, there was no horizontal overflow and the heading and controls remained available.
- All observed page requests were same-origin. No third-party script, font, analytics, or tracking request appeared.
- `/`, `/demo`, `/privacy`, and `/terms` returned 200 with distinct titles, one `h1`, matching canonicals, `lang="en"`, and one main landmark. `/not-a-route` returned the designed page with HTTP 404 and a working return link.
- All crawled internal links, `robots.txt`, `sitemap.xml`, and the social card returned 200. Responses included CSP, `X-Content-Type-Options`, and `Referrer-Policy`.
- Offline reload and an update flow are not promised. No service worker is registered.
- Lighthouse mobile on `/demo`: Performance 97, Accessibility 100, Best Practices 96, SEO 100, FCP 1.0 s, LCP 1.2 s, CLS 0, TBT 200 ms. Best Practices is reduced by the missing replay endpoint’s console error.
- Clean output: JavaScript 30.58 KB (10.67 KB gzip); CSS 16.10 KB (4.32 KB gzip).

## Live candidate comparison

| Artifact | Clean build SHA-256 | Live SHA-256 |
| --- | --- | --- |
| `index.html` | `aab6b895963f4dd69026cecd8dda54a6209abd236f2bd906a7a8f82abe312ec1` | same |
| Main JavaScript | `bbc04353f73e673181bd549489033b5b142960f015a4272fe58e7173ec031d61` | same |
| Main CSS | `524bc103920e60e3b77d75df192c5ea8dd62455b6ef93001673f7aa97729c5a1` | same |

The frontend matches. The backend behavior does not match candidate `64cc2c4`: that candidate defines `/health` and replay routes, while live returns static 404/405 responses. The later `4408b0f` changes only the SQLite VFS used outside `/data`; `e518b7e` and `e8d21d9` are report-only revisions.

## Earlier finding disposition

| Earlier finding | Current disposition |
| --- | --- |
| Sample action did not load a shared route | Fixed for the bundled sample marker and populated card. The live server seed request still fails under RRV3-01. |
| Archive link did not open the archive | Fixed. |
| Route and dialog focus loss | Fixed. |
| Phone targets under 44 pixels | Fixed. |
| Invalid demo-banner ARIA | Fixed. |
| Home canonical on non-home routes | Fixed. |
| Unknown route returned 200 | Fixed. The deliberate 404 is correct. |
| Five public behaviors lacked claims | Fixed for those five behaviors; RRV3-02 is a new server-storage claim gap. |
| Archive navigation settled past its heading | Fixed on desktop and phone after a 1.2-second settle. |
| Server-side replay verification was absent | Implemented and passing locally, but not available on the live origin. Open as RRV3-01. |

## Evidence

The evidence set is `/work/.evidence/rankless-rally-verify-3/`. Key files are `backend-live.json`, `live-qa.json`, `live-detail.json`, `live-build-hashes.log`, `npm-test.log`, `lighthouse-mobile.json`, the `claims/` logs, screenshots, and `live-phone-win-loss.webm`.
