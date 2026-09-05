# Rankless Rally

Rankless Rally is a free browser game for puzzle players who want to improve a personal route score instead of a rank. Start a sample board without a sign-in or payment step at [`/demo`](https://rankless-rally.sociobot.in/demo).

A standard board starts with 90 seconds. Connect three relays in order, reach the exit, and compare speed left, elegance, and rescues on a personal rally card. Play with a mouse, touch controls, Arrow keys, or WASD.

## What is included

- One daily board and 20 permanent practice boards.
- A restartable 90-second run, pause/recovery, local settings, and an assist option that gives new runs 135 seconds.
- Self-contained replay codes. Another browser can load a completed route without an account. Replay codes contain a board id and move letters, not a name or profile.
- A one-click demo at `/demo`. It opens Practice 01 with a sample best card and shared route. Demo state uses separate `demo:rankless-rally:*` browser-storage keys. Resetting it does not change real-game data.
- No external scripts, fonts, analytics, ads, accounts, payment flow, or gameplay backend service.

The static deployment does not provide a server-authoritative anti-cheat service or server-persisted rooms. A product-owned backend remains required before this game can claim server-side replay verification.

## Run locally

Requires Node.js 22+ and npm.

```bash
npm install
npm run dev
```

Open `http://localhost:5173/demo` for the isolated sample game.

## Verify

```bash
npm test
npm run build
```

`npm test` builds the app, runs every Playwright claim check in desktop and phone-sized Chromium, tests a real win route, restart, settings persistence, demo isolation, shared replay in an independent browser, archive, privacy requests, fixed-step timing, route errors/recovery, legal routes, real 404 handling, console errors, and serious/critical Axe findings.

Every public behavior is listed in [`.factory/claims.json`](.factory/claims.json). Run one declared claim from a clean checkout with its exact `test` command, for example:

```bash
npm test -- --grep @claim:complete-run
```

The static output is written to `dist/`. It emits real pages for `/demo`, `/privacy`, and `/terms`; `staticwebapp.config.json` sends all unknown routes to the designed 404 page with HTTP 404.

## Deploy

This is a static Vite deployment for `https://rankless-rally.sociobot.in`. Build with `npm run build`, then publish `dist/` using the product’s existing factory static deployment configuration. It has no database, service process, volume, environment variable, or external provider to configure.

## Privacy and terms

The game saves settings, a current run, and personal best cards in browser storage. The demo uses a separate storage namespace. See [`/privacy`](https://rankless-rally.sociobot.in/privacy) and [`/terms`](https://rankless-rally.sociobot.in/terms).

## License

MIT. See [LICENSE](LICENSE).
