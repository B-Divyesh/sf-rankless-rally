# Rankless Rally

Rankless Rally is a free browser game for puzzle players who want to improve a personal route score instead of a rank. Start a sample board without a sign-in or payment step at [`/demo`](https://rankless-rally.sociobot.in/demo).

A standard board starts with 90 seconds. Connect three relays in order, reach the exit, and compare speed left, elegance, and rescues on a personal rally card. Play with a mouse, touch controls, Arrow keys, or WASD.

## What is included

- One daily board and 20 permanent practice boards.
- A restartable 90-second run, pause/recovery, local settings, and an assist option that gives new runs 135 seconds.
- Server-checked replay codes. After a completed route, the product server verifies the deterministic moves, stores the board and moves in SQLite, and returns an opaque code. Another browser can load it without an account. Codes contain no name or profile.
- A one-click demo at `/demo`. It opens Practice 01 with a sample best card and shared route. Demo state uses separate `demo:rankless-rally:*` browser-storage keys. Resetting it does not change real-game data.
- No external scripts, fonts, analytics, ads, accounts, or payment flow. The only gameplay request is to this product’s replay verifier.

## Run locally

Requires Node.js 22+, npm, and a current stable Rust toolchain.

```bash
npm ci
npm run dev
```

Open `http://localhost:5173/demo` for the isolated sample game. `npm run dev` builds the Vite output and starts the Rust server with a local SQLite database in `data/`.

## Verify

```bash
npm test
npm run build
cargo test
npm run verify:public -- https://rankless-rally.sociobot.in --rate-limit
```

`npm test` builds the app, runs Rust API checks and every Playwright claim check in desktop and phone-sized Chromium, tests a real win route, server-verified replay, restart, settings persistence, demo isolation, archive, privacy requests, fixed-step timing, route errors/recovery, legal routes, real 404 handling, console errors, and serious/critical Axe findings.

Every public behavior is listed in [`.factory/claims.json`](.factory/claims.json). Run one declared claim from a clean checkout with its exact `test` command, for example:

```bash
npm test -- --grep @claim:complete-run
```

The static web output is written to `dist/`. The Rust server serves it and returns the designed 404 page with HTTP 404 for unknown routes.

The public verifier requires the deployed HTTPS origin. It checks JSON health, demo and public tenant separation, completed and incomplete replay handling, an independent replay read, and the 300-request allowance followed by `429` and `Retry-After: 60`.

## Deploy

This product deploys as one Rust container at `https://rankless-rally.sociobot.in`. It serves `dist/` and its replay API from the same origin. The server starts with only `PORT`; it writes SQLite state to `/data/rankless-rally-replays-v3.sqlite3` on the fleet-mounted durable volume and runs as one replica. The product needs no external provider or credential.

Use the container deployment wrapper. The public CNAME must target `sf-rankless-rally.orangepond-1638693f.eastus2.azurecontainerapps.io`; a static deployment cannot serve the replay API. Preserve the existing `/data` mount, single-revision mode, and one-replica limits.

## Privacy and terms

The game saves settings, a current run, and personal best cards in browser storage. The demo uses a separate storage namespace. When you request a replay code, the server stores its board ID, moves, opaque code, tenant (`public` or `demo`), and creation time. Demo records also have a 24-hour expiry. It stores no account, name, profile, or browser settings. A request-address rate limit is held in memory for up to one minute. See [`/privacy`](https://rankless-rally.sociobot.in/privacy) and [`/terms`](https://rankless-rally.sociobot.in/terms).

## License

MIT. See [LICENSE](LICENSE).
