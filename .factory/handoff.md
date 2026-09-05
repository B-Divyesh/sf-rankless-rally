# Rankless Rally handoff

## Current verification result

Independent verification 1 is **FAIL** with 9 findings and 5 untested public claims. The full report is [`.factory/verification-1.md`](verification-1.md).

- Runtime implementation: `a233ee515b65265dcb9332d5911ab3741b915665`
- Claims and documentation revision reviewed: `9775839e2f5165673e2d6638135f4d43de771edb`
- Verification report commit: `2e749e5db4be5db31d9a6532127de0e84afc5128`
- Live URL: `https://rankless-rally.sociobot.in`
- The live HTML, JavaScript, and CSS exactly match the clean candidate build.

No product code was changed during verification.

## What works

- The first desktop and phone screens show the routing job, audience, sample action, and live game board.
- The one-click demo has isolated storage, a persistent sample label, Practice 01, and a populated sample best card.
- Reset demo preserves temporary real-game state, and Start for real removes demo keys.
- A deterministic keyboard run reaches the real win screen and creates a three-part rally card.
- Timer expiry reaches the real loss screen, and restart restores 1:30.
- A completed replay code opens and animates in an independent fresh browser.
- Arrow keys, WASD, pointer, and phone taps work. Settings, pause/reload recovery, assist time, and reduced motion work.
- Privacy and legal pages load with route titles. No console errors or third-party requests appeared in the tested flow.

## Checks run

- Clean checkout at `9775839`: `npm ci`, `npm test`, and the build run inside that command.
- Result: 30 Playwright tests passed across desktop and phone.
- Every one of the 14 `.factory/claims.json` commands was run separately and passed in both projects.
- `scripts/verify-url.sh` passed against the five live routes checked.
- Full and WCAG-tagged Axe checks were run in light and dark treatment.
- Lighthouse mobile on live `/demo`: Performance 100, Accessibility 99, Best Practices 100, SEO 92; LCP 0.9 s and CLS 0.
- Live artifacts matched the clean build by SHA-256.

## Findings to resolve

1. The sample action promises a shared route, but the demo does not preload one.
2. The Archive header link changes the URL without moving to the archive.
3. SPA route changes and dialog close actions lose keyboard focus.
4. Several phone navigation and footer links are under 44 pixels high.
5. The demo banner assigns `role="status"` to an incompatible `aside`.
6. Demo and legal routes retain the home canonical URL.
7. Unknown live URLs render the 404 design with HTTP 200.
8. Five public behaviors lack complete tagged claim tests.
9. Deterministic replay logs are not verified server-side as required by the brief.

## Verification commands

```bash
npm ci
npm test
npm run build
scripts/verify-url.sh https://rankless-rally.sociobot.in/demo
```

Run every command listed in `.factory/claims.json` separately after repairs. Do not declare PASS until the report’s findings and untested claims are both zero.

## Evidence

Browser screenshots and the Lighthouse JSON are under `/work/.evidence/rankless-rally-verify-1/`. The required report copy is `/work/.evidence/qa-report.md`, and the machine result is `/work/.evidence/qa-result.json`.
