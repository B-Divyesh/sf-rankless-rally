# Rankless Rally handoff

## Release

- Runtime implementation: `4408b0ff35c3dfc6f9121e30c0bed6617d9ca3f1`.
- Deployment: one product-owned Rust container with one replica and a durable `/data` Azure Files mount.
- Live URL: <https://rankless-rally.sociobot.in>

Rankless Rally is a 90-second routing puzzle for people who want to improve a personal score without a ranked ladder. The first screen shows the board, says **Connect every relay before time ends**, identifies players who want a personal route score, and starts with **Try it with sample data**.

## What changed

- Fixed Archive navigation at its cause: it no longer smooth-scrolls or estimates hidden section height. After Archive is selected, the practice-board heading remains fully visible and receives keyboard focus on desktop and phone.
- Added a product-owned Rust/Axum replay service. A completed route is checked against the deterministic board on the server before it receives an opaque `RR2-…` code.
- Added durable SQLite replay storage on `/data/rankless-rally-replays-v3.sqlite3`. The service uses SQLite's `unix-dotfile` VFS because the mounted Azure Files share does not support SQLite byte-range locks. The deployment is deliberately fixed at one replica and the server serializes its one database connection.
- Kept demo and public replay records in separate tenants. They cannot resolve each other's codes. Demo records expire after 24 hours; demo browser data remains under the `demo:rankless-rally:*` namespace.
- Added live-safe replay limits: 300 requests per client per minute return HTTP 429 with `Retry-After: 60`. This permits normal parallel game and browser activity while bounding unauthenticated replay requests.
- Preserved free play, the permanent archive, local settings, keyboard/touch play, score cards, privacy/terms, and all prior repaired behavior.

## Verification

From the documented clean setup, `npm test` passed 50 checks on the final implementation. All 21 commands in `.factory/claims.json` also passed separately in desktop and phone projects.

The final browser build is 30.58 KB JavaScript (10.67 KB gzip) and 16.10 KB CSS (4.32 KB gzip).

Live checks on the final service covered:

- `/health` reports the deployed implementation and `database: ready`.
- An invalid replay returned 422; a completed replay returned a code and resolved with 200.
- Public and demo replay tenants returned 404 when asked for each other's code.
- A replay persisted after a revision restart and returned 200 from the new replica.
- A 360-request live burst reached 429, and the follow-up response included `Retry-After: 60`.
- Fresh desktop and phone browser contexts showed the job, audience, first action, and playable board before scrolling. Each entered the demo, completed the board, received an `RR2-…` code, reset demo data, and retained the interrupted real run.
- Archive focus was `archive-title` with the heading fully in view on both sizes. Light and dark Axe scans had zero violations; no console errors occurred.
- `scripts/verify-url.sh` passed over HTTPS for `/`, `/demo`, `/privacy`, `/terms`, and `/not-a-route`. The last path returns the designed HTTP 404.

Evidence is in `/work/.evidence/rankless-rally-repair-2/`, including `claims-final-allowance.log`, `npm-test-rate-allowance.log`, live API results, rate-limit evidence, browser screenshots, and the restart-persistence result.

## Earlier finding disposition

| Finding | Disposition |
| --- | --- |
| Archive heading was hidden after settled navigation | Fixed and covered by a delayed desktop/phone outcome check. |
| Server-authoritative replay verification and SQLite were absent | Fixed with the same-origin Rust verifier, deterministic validation, opaque codes, and durable SQLite state. |
| Demo isolation, focus, targets, 404, metadata, and previous minor findings | Remain covered by the final browser and claim suites. |

## Known limits

- The product does not promise offline reload or updates, so it does not ship a service worker.
- No paid offer is advertised, so no billing registration metadata is required. The entire game core remains free.
- The current frame-rate statement is a tested fixed 60 Hz simulation update, not a promise of 60 rendered frames per second on every device.
