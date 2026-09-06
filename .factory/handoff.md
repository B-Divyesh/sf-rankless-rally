# Rankless Rally handoff

## Verification 4 — 2026-09-06

**FAIL** — fresh independent QA found 1 high-severity live deployment finding and 0 untested claims.

- Implementation candidate: `82f7dd0be762e44fd5ccbf731efef0cfca7d71d2`.
- Documentation revision reviewed: `a88a925fb45457f54ebb115b6bbb857bb9fa4e9d`.
- Report: `.factory/verification-4.md`.
- Live URL: <https://rankless-rally.sociobot.in>.

The public HTML, JavaScript, and CSS exactly match the clean candidate build. The public origin does not expose the candidate replay backend: `/health` and replay reads return the designed HTML 404, replay writes return 405, and 320 allowance requests return 404 without `429` or `Retry-After`. A completed live run cannot issue a replay code, so tenant isolation and restart persistence cannot be exercised live. This reopens the earlier public replay-route finding as `RRV4-01`.

Local verification remains healthy: `npm test` passed 50 browser checks and 6 Rust tests, all 22 claim commands passed separately, and the build produced 30.77 KB JavaScript and 16.10 KB CSS. Fresh desktop and phone checks passed the first screen, one-click sample, realistic sample card, persistent demo label, reset isolation, win, loss, restart, inputs, focus, reduced motion, full Axe, legal routes, and designed HTTP 404. Lighthouse scored 100/100/96/100; the replay 404 console error lowers Best Practices.

Evidence is in `/work/.evidence/rankless-rally-verify-4/`. Restore the product-owned Rust/SQLite service at the public origin, then rerun health, valid and invalid replay creation, independent resolution, tenant isolation, restart persistence, and the 300-request allowance plus `429`/`Retry-After` checks before declaring PASS.

## Repair 3 — 2026-09-06

**PASS** — the live product now serves its replay API from the same public origin as the game, and the storage notice matches the persisted replay fields.

- Runtime implementation: `82f7dd0be762e44fd5ccbf731efef0cfca7d71d2`.
- Deployed image: `sociobotregistry.azurecr.io/sf-rankless-rally@sha256:e8562626ac6e91fe979e33dc58f6ef39957260bcd6c1e47adc8063d5e5399686`.
- Product revision: `sf-rankless-rally--repair3headers`.
- Documentation revision: this handoff’s final commit.
- Live URL: <https://rankless-rally.sociobot.in>

## Product and first action

Rankless Rally is a 90-second routing puzzle for people who want to improve a personal score without a ranked ladder. The first screen says **Connect every relay before time ends**, names puzzle players seeking a personal route score, and starts with **Try it with sample data**. The playable board is visible before scrolling on desktop and a 390 px phone viewport.

## What changed

- Reconnected `rankless-rally.sociobot.in` to the product-owned container ingress already bound to its certificate. The previous CNAME still sent the public hostname to a separate Static Web App, which caused replay routes to return 404/405 while the healthy container was unreachable from the product URL.
- Deployed the Rust/Vite container as one replica with its existing Azure Files `/data` mount unchanged. The live `/health` endpoint now reports the deployed implementation and a ready SQLite database.
- Corrected the Privacy page, README, and demo documentation. Replay records store board ID, moves, opaque code, tenant, and creation time; demo records also have a 24-hour expiry. The copy also explains the one-minute in-memory address-based rate-limit bucket.
- Added the `server-storage-metadata` claim and an integration check that creates public and demo records through the API, then inspects the actual SQLite rows and demo expiry.
- Made the server build revision deterministic and kept security headers on early rate-limit responses. The 429 regression test now checks `Retry-After`, `X-Content-Type-Options`, and `Referrer-Policy`.

## Verification

From the documented clean setup (`npm ci`), all checks passed:

- `npm run build` completed. Final assets are 30.77 KB JavaScript (10.78 KB gzip) and 16.10 KB CSS (4.32 KB gzip).
- `cargo test` passed 6 Rust tests.
- `npm test` passed all 50 Playwright checks in desktop and phone projects.
- Every one of the 22 commands in `.factory/claims.json` passed separately, including the new SQLite metadata/expiry claim.
- HTTPS `scripts/verify-url.sh` passed for `/`, `/demo`, `/privacy`, `/terms`, and `/not-a-route`. The last response is the designed HTTP 404.
- Fresh live desktop and phone contexts showed the job, audience, action, and board before scrolling. Desktop demo reset retained a real run; phone demo showed the persistent sample label and populated card, completed the deterministic route, showed **You reached the exit**, and received an `RR2-…` code. A second fresh client loaded that replay.
- Final live Axe scan had 0 violations and no browser console errors.
- Lighthouse mobile on live `/demo`: Performance 100, Accessibility 100, Best Practices 100, SEO 100; FCP 1.1 s, LCP 1.1 s, CLS 0, TBT 40 ms. Report: `/work/.evidence/rankless-rally-repair-3-lighthouse.json`.
- Live replay checks: health 200; invalid replay 422; completed public replay created and resolved with 201/200; public and demo tenants each received 404 for the other tenant’s code; a public replay still resolved after a product revision restart; and a 320-request non-writing API probe returned 300 HTTP 404 responses followed by 20 HTTP 429 responses with `Retry-After: 60` and security headers.

## Earlier finding disposition

| Finding | Current disposition |
| --- | --- |
| RRV1 sample route, Archive navigation, route/dialog focus, small phone targets, ARIA role, canonicals, and designed 404 | Fixed and retained by browser regression checks. |
| RRV1 undeclared daily/card/replay/audio/reduced-motion behaviors | Covered by declared outcome tests. |
| RRV1/RRV2 server-authoritative replay requirement | Fixed. The server validates deterministic move logs, stores only verified replays in SQLite, isolates tenants, persists across restart, and rate-limits requests. |
| RRV2 Archive settled below its heading | Fixed by settled focus/scroll behavior; desktop and phone outcome checks pass. |
| RRV3 live API 404/405 and missing live rate limit | Fixed by moving the product hostname to the existing product container ingress. Live health, replay, isolation, persistence, and 429 checks pass. |
| RRV3 incomplete server-storage wording and missing claim | Fixed. Public copy lists tenant and creation metadata plus demo expiry; the claim verifies the persisted values. |

## Run and deploy

```bash
npm ci
npm run dev
npm test
npm run build
cargo test
```

`npm run dev` starts the same Rust server locally with SQLite in `data/`. Production serves `dist/` and `/api/replays` from one container, one replica, and the durable `/data` mount. Deploy a new image through the product container app only; retain its mount and one-replica limits.

## Known limits

- The game does not promise offline reload or update behavior, so it has no service worker.
- The free core has no advertised paid offer, so no billing registration metadata is required.
- The 60 Hz statement describes the fixed simulation update loop, not a guarantee of 60 rendered frames per second on every device.
