# Rankless Rally handoff

## Release

- Runtime implementation: `d15b43bd58af170d659b6c3e97863f96fa81062e`
- Documentation revision: recorded in the follow-up handoff commit.
- Deployment: product static target, deployed from `dist/` on 2026-09-05.
- Live URL: <https://rankless-rally.sociobot.in>

Rankless Rally is a free 90-second routing puzzle for players who want to improve a personal route score without a ranked ladder. A run uses mouse, touch controls, Arrow keys, or WASD. The first screen tells visitors to connect relays before time ends, identifies puzzle players who want a personal score, and starts with **Try it with sample data**.

## What changed

- The first-screen sample action now opens Practice 01 with a sample rally card and a visible shared-route marker. Reset restores that sample without changing real-game storage.
- Archive navigation now scrolls and focuses the archive heading. Route changes focus the new page heading, and closing settings restores focus to the Settings control.
- Header, privacy, and footer links now meet the 44 by 44 pixel touch-target requirement. The demo banner no longer uses an invalid ARIA role.
- `/`, `/demo`, `/privacy`, and `/terms` are emitted as real static pages with route-specific titles, descriptions, social metadata, and canonicals. Unknown routes now return the designed 404 page with HTTP 404.
- Replay logs now reject incomplete or impossible deterministic routes before display. Historic daily replay ids can resolve their board date. This is browser-side validation only.
- Added outcome-based tests for the daily date change, rally-card values, replay privacy and completion, route audio timing, reduced replay motion, demo output, focus, target size, metadata, and HTTP 404 behavior.

## Verification

From the documented clean setup:

```bash
npm ci
npm test
npm run build
```

- `npm test` passed: 46 Playwright checks across desktop Chromium and iPhone-sized Chromium.
- All 20 commands in `.factory/claims.json` passed separately in both browser projects, including the six new or expanded replay, daily, card, audio, and reduced-motion claims.
- `scripts/verify-url.sh` passed locally and over HTTPS for `/`, `/demo`, `/privacy`, `/terms`, and `/not-a-route`. The first four return 200; `/not-a-route` returns 404.
- Full Axe checks against the live `/demo` returned zero serious or critical issues and zero `aria-allowed-role` issues in light and dark treatments.
- Build output: JavaScript 28.69 KB (10.07 KB gzip); CSS 16.16 KB (4.35 KB gzip).
- Fresh live desktop and phone contexts had no console errors. Both showed the job, audience, first action, and board before scrolling. The board began at 378 px of a 900 px desktop viewport and 510 px of a 664 px phone viewport. The demo was played through the real win screen with `RRRRRURUUUUU`.

Evidence screenshots are in `/work/.evidence/rankless-rally-repair-1/`:

- `live-desktop-first-screen.png`
- `live-phone-first-screen.png`
- `live-phone-win.png`

## Earlier finding disposition

| Finding | Status |
| --- | --- |
| Sample promised a shared route | Fixed: demo loads a visible completed shared route. |
| Archive changed URL only | Fixed: navigation scrolls and focuses the archive heading. |
| Route and dialog focus loss | Fixed: focusable headings and explicit focus restoration. |
| Small phone targets | Fixed: site navigation and footer links are at least 44 px in both dimensions. |
| Invalid demo-banner ARIA | Fixed: the banner remains an `aside` without `role="status"`. |
| Home canonical on legal/demo pages | Fixed: static and client metadata use matching production canonicals. |
| Unknown route returned 200 | Fixed: real route files replace the broad fallback; live unknown route returns 404. |
| Five public behaviors lacked claims | Fixed: all behaviors now have observable tagged checks; inventory has 20 claims. |
| Server-side replay verification | Open: the assigned live product is a static deployment with no API or SQLite service. Browser-side replay validation prevents incomplete and impossible logs from loading, but it is not server authority. A product-owned, one-replica verifier service with SQLite on `/data` is required before claiming server-side anti-cheat. |

## Known gaps and next steps

- The only remaining brief gap is server-authoritative replay verification. It cannot be truthfully provided by the current static deployment; no backend or external provider was added.
- The game does not promise offline reload or updates, so no service-worker flow is shipped.
- No paid offer is advertised, so there is no billing registration metadata. The free core, archive, score cards, and replays remain available without an account.
