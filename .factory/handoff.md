# Rankless Rally handoff

## Independent review 2 — 2026-09-06

**PASS — 0 findings and 0 untested public claims.**

- Implementation reviewed: `6ea1f1ee8c91e0882216af7fa855c01e132901f3`.
- Documentation reviewed: `58e741a71146e7b19a6b611fef6537b4d2526027`.
- Full report: [`.factory/review-2.md`](review-2.md).
- Evidence: `/work/.evidence/rankless-rally-review-2/`.

Fresh desktop and phone browsers showed the playable board on the first screen. The phone review entered the one-click demo, verified the persistent sample label and populated card, reset it without changing a real paused run, completed a touch-control win, loaded the replay in an independent client, restarted, and reached an actual loss end screen. The recorded run and end-screen screenshots are in the review evidence.

From a clean checkout, `npm ci`, `npm run build`, `cargo test`, and `npm test` passed; the aggregate test run passed 52 browser checks and 6 Rust tests. Every one of the 22 exact declared claim commands passed independently. The same 52 browser checks passed on the live desktop and phone site.

The live public checker passed health, server validation, independent replay reading, tenant isolation, and the 300-request rate limit with `429`/`Retry-After`. A replay created before restarting only `sf-rankless-rally--repair4focus` resolved byte-for-byte after the new product replica was running, proving durable `/data` persistence. Fresh phone measurement was 60.18 fps and the active run reported a 60 Hz update sample. URL checks, full light/dark Axe checks, keyboard/focus, reduced motion, privacy requests, legal pages, internal links, and the expected designed 404 all passed.

No product code changed during the review. No known product defect or untested public claim remains.

## Independent review 1 — 2026-09-06

**PASS — 0 findings and 0 untested public claims.**

- Implementation reviewed: `6ea1f1ee8c91e0882216af7fa855c01e132901f3`.
- Documentation reviewed: `95e9d9da9e518ec2f717c8a06341578f1269e1f3`.
- Full report: [`.factory/review-1.md`](review-1.md).
- Evidence: `/work/.evidence/rankless-rally-review-1/`.

Fresh desktop and phone browsers showed the playable board on the first screen. The reviewer entered the one-click demo, checked its persistent sample label and populated card, reset it without changing a real paused run, and completed a deterministic phone win, restart, and loss. The live desktop and phone Playwright suite passed all 52 checks. A recorded phone win/restart/loss run is in the review evidence.

From clean setup, `npm ci`, `npm test` (52 browser and 6 Rust tests), `npm run build`, and every one of the 22 exact claim commands passed. The live public verifier passed health, server validation, independent replay reading, tenant isolation, and 300-request rate limiting with `429`/`Retry-After`. `scripts/verify-url.sh` passed for every public route, including the expected designed 404. Full Axe, privacy-request, keyboard, focus, reduced-motion, legal-route, and metadata checks passed.

No product code changed during the review. No product defect or untested public claim remains known.

## Independent verification 5 — 2026-09-06

**PASS — 0 findings and 0 untested public claims.**

- Implementation reviewed: `6ea1f1ee8c91e0882216af7fa855c01e132901f3`.
- Documentation reviewed: `7f88debcdc08ea0701c485c0d27d3be3d757f52b`.
- Full report: [`.factory/verification-5.md`](verification-5.md).
- Evidence: `/work/.evidence/rankless-rally-verify-5/`.

Fresh local setup passed 52 browser tests, 6 Rust tests, and all 22 claim commands independently. The same 52 browser checks passed on the live desktop and phone projects. The deterministic phone run reached a win, issued a replay code, opened in an independent client, reset, and reached both manual and natural-timeout loss screens. The recorded phone run measured 59.99 rendered frames per second.

The public backend returned build `6ea1f1e`, kept demo and public tenants separate, rejected incomplete routes, allowed 300 requests before `429` with `Retry-After: 60`, and preserved a replay byte-for-byte across a restart of only `sf-rankless-rally--repair4focus`. The revision settled back to one healthy running replica. Lighthouse mobile scored 100/100/100/100. Full Axe found no light- or dark-treatment violation.

No product code changed during verification. The only repository changes are this handoff update and the verification report.

## Repair 4 — 2026-09-06

**READY FOR INDEPENDENT QA** — RRV4-01 is repaired at the public deployment boundary.

- Runtime implementation: `6ea1f1ee8c91e0882216af7fa855c01e132901f3`.
- Deployed image: `sociobotregistry.azurecr.io/sf-rankless-rally@sha256:4ff4764ecb435ada3dcaf8621b51ccb40751a0fbfc4dc357541417c23a23fbae`.
- Product revision: `sf-rankless-rally--repair4focus`.
- Documentation revision: the commit containing this handoff.
- Live URL: <https://rankless-rally.sociobot.in>.

## Product and first action

Rankless Rally is a 90-second routing puzzle for people who want to improve a personal score without a ranked ladder. The first screen says **Connect every relay before time ends**, names puzzle players who want a personal route score, and starts with **Try it with sample data**. The playable board is visible before scrolling on desktop and phone.

## What changed

- Repointed only the `rankless-rally.sociobot.in` CNAME from the legacy Static Web App to `sf-rankless-rally.orangepond-1638693f.eastus2.azurecontainerapps.io`. The public origin now reaches the product-owned container and its same-origin replay API.
- Deployed the current Rust/Vite container with the existing `sf-rankless-rally-data` Azure Files volume mounted at `/data`. The app remains in single-revision mode with `minReplicas: 1` and `maxReplicas: 1`.
- Added `npm run verify:public -- <origin> --rate-limit`. It checks HTTPS JSON health, the demo replay, complete and incomplete replay writes, tenant isolation, an independent read, and the 300-request allowance followed by `429` with `Retry-After: 60`.
- Made the Playwright suite runnable against the public origin and able to retain screenshots, traces, and video for successful runs.
- Added an end-to-end win, restart, and supported loss regression.
- Removed a redundant render when the server confirms the bundled demo replay. A delayed-response regression now proves that closing Settings keeps focus on its trigger even if demo hydration finishes afterward.

## Deployment proof

- `GET https://rankless-rally.sociobot.in/health` returns `200` JSON with build `6ea1f1ee8c91e0882216af7fa855c01e132901f3` and `database: ready`.
- Demo replay creation returns `200` for the demo tenant. The same code returns `404` to the public tenant.
- A completed `practice-01` route returns `201` and an opaque `RR2-…` code. An incomplete route returns `422`.
- A second client resolves the completed public code with `200`. The demo tenant receives `404` for that public code.
- A public replay created before the final image rollout still resolved afterward, proving that the new revision kept `/data` state.
- The final allowance check admitted 300 API requests in one minute: 6 validation requests plus 294 non-writing probes. The next 26 probes returned `429`; the response included `Retry-After: 60`, `X-Content-Type-Options`, and `Referrer-Policy`.
- The final active revision is healthy at 100% traffic with one replica. The earlier revision scaled away. The CNAME has a 300-second TTL and still targets the container FQDN.

## Verification

From the documented clean setup:

- `npm ci` completed with 0 audit vulnerabilities.
- `npm test` passed 52 browser checks and 6 Rust tests.
- All 22 exact commands in `.factory/claims.json` passed separately on the final implementation.
- `npm run build` produced 30.88 KB JavaScript (10.78 KB gzip) and 16.10 KB CSS (4.33 KB gzip).
- The final public Playwright run passed all 52 checks on fresh desktop and phone projects. It covered one-click sample data, the persistent sample label, populated card, reset without real-data changes, keyboard/touch play, win, restart, loss, settings, reduced motion, focus, route titles, legal pages, designed HTTP 404, full Axe in light/dark, and an independent replay client. No unexpected console error remained.
- `scripts/verify-url.sh` passed over HTTPS for `/`, `/demo`, `/privacy`, `/terms`, and `/not-a-route`; the last path is the deliberate HTTP 404.
- Lighthouse mobile on `/demo`: Performance 100, Accessibility 100, Best Practices 100, SEO 100; FCP 1.2 s, LCP 1.3 s, CLS 0, TBT 70 ms.
- Evidence is under `/work/.evidence/rankless-rally-repair-4/`. The clean live run is in `live-browser-pass/`, including desktop and phone videos for the win/restart/loss path and the independent replay path. `lighthouse-mobile.json` contains the performance report, and `claims-final/` contains every final claim-command log.
- `.factory/catalog-description.txt` remains a verb-first 79-byte description and was copied to `/work/.evidence/catalog-description.txt`.

## Earlier finding disposition

| Finding | Current disposition |
| --- | --- |
| RRV1 sample replay, Archive navigation, route/dialog focus, phone targets, ARIA, canonicals, and designed 404 | Fixed and covered by outcome checks. |
| RRV1 undeclared daily/card/replay/audio/reduced-motion behavior | Covered by the 22 declared claim commands. |
| RRV1/RRV2 missing server-authoritative replay verification | Fixed by deterministic server validation and SQLite storage. |
| RRV2 Archive overscroll | Fixed; settled desktop and phone checks keep the focused heading visible. |
| RRV3 storage wording and missing storage claim | Fixed; copy and the SQLite metadata/expiry integration claim agree. |
| RRV3/RRV4 public replay API returned static 404/405 responses | Fixed at the cause. Public DNS now reaches the container; health, writes, reads, isolation, restart persistence, and rate limiting pass over HTTPS. |
| Repair-4 delayed demo hydration could replace the focused Settings trigger | Fixed by avoiding the no-op render and covered with a delayed-response focus check. |

## Run and deploy

```bash
npm ci
npm test
npm run build
cargo test
npm run verify:public -- https://rankless-rally.sociobot.in --rate-limit
```

Production must use the container wrapper. Keep the product CNAME on the container app FQDN, keep the existing `/data` mount, use single-revision mode, and keep both replica bounds at one. The legacy Static Web App is not on the public DNS path and must not be used for this backend product.

## Known limits

- The game does not promise offline reload or update behavior, so it has no service worker.
- The free core has no advertised paid offer, so no billing metadata is required.
- The 60 Hz statement describes the fixed simulation update loop, not a guarantee of 60 rendered frames per second on every device.

No product defect remains known. Return this build to fresh independent QA.
